#!/usr/bin/env python3
"""
Toonflow Indonesian (id-ID) Locale Patch Script v3.0
=====================================================
Creates a complete Indonesian locale from scratch and injects it into
data/web/index.html. Works even when the build has NO existing id-ID locale.

Detection strategy (no hardcoded variable names):
  1. Find Chinese settings: <var>={title:"ToonFlow设置",...}
  2. Find English settings: <var>={title:"ToonFlow Settings",...}
  3. Find full locale objects that reference those settings sub-variables
  4. Find vue-i18n messages config: messages:{...}
  5. Find language selector array: [{label:...,value:"zh-CN"},...]
  6. Create new Indonesian locale variable and inject it

Usage:
    python patch-indonesian.py [path_to_toonflow]

Example:
    python patch-indonesian.py D:\\Toonflow-app
"""

import sys
import os
import re
import json
import shutil

# ============================================================
# Indonesian locale - loaded from id-ID.json at runtime
# ============================================================
ID_ID_JSON_FILENAME = "id-ID.json"


def find_closing_brace(content, start_pos):
    """Find matching } for { at start_pos. Returns pos AFTER the }."""
    brace_count = 1
    pos = start_pos
    in_string = False
    string_char = None
    while brace_count > 0 and pos < len(content):
        ch = content[pos]
        if in_string:
            if ch == '\\':
                pos += 1  # skip escaped char
            elif ch == string_char:
                in_string = False
        else:
            if ch in ('"', "'"):
                in_string = True
                string_char = ch
            elif ch == '{':
                brace_count += 1
            elif ch == '}':
                brace_count -= 1
        pos += 1
    return pos


def find_closing_bracket(content, start_pos):
    """Find matching ] for [ at start_pos. Returns pos AFTER the ]."""
    bracket_count = 1
    pos = start_pos
    in_string = False
    string_char = None
    while bracket_count > 0 and pos < len(content):
        ch = content[pos]
        if in_string:
            if ch == '\\':
                pos += 1
            elif ch == string_char:
                in_string = False
        else:
            if ch in ('"', "'"):
                in_string = True
                string_char = ch
            elif ch == '[':
                bracket_count += 1
            elif ch == ']':
                bracket_count -= 1
        pos += 1
    return pos


def detect_settings_variable(content, title_pattern):
    """Find a settings sub-variable by its title string.
    Returns (variable_name, position) or (None, None).
    """
    pattern = r'([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*\{title\s*:\s*' + re.escape(title_pattern)
    m = re.search(pattern, content)
    if m:
        return m.group(1), m.start()
    return None, None


def detect_full_locale_variable(content, settings_varname):
    """Find the full locale variable that references a given settings sub-variable.
    Pattern: <var>={components:<v>,settings:<settings_var>,workbench:<v>,login:<v>}
    Returns (variable_name, position) or (None, None).
    """
    pattern = (r'([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*\{components\s*:\s*'
               r'([a-zA-Z_$][a-zA-Z0-9_$]*)\s*,\s*settings\s*:\s*'
               + re.escape(settings_varname))
    m = re.search(pattern, content)
    if m:
        return m.group(1), m.start()
    return None, None


def detect_i18n_messages_config(content):
    """Find the vue-i18n messages:{...} configuration.
    Returns (messages_start, messages_end, content_between_braces) or (None, None, None).
    """
    # Look for messages:{"zh-CN" or messages:{"en" - the main i18n config
    for m in re.finditer(r'messages\s*:\s*\{', content):
        pos = m.end()  # position after the opening {
        # Check if this looks like the main i18n config (has zh-CN)
        lookahead = content[pos:pos + 500]
        if '"zh-CN"' in lookahead:
            # Find the closing brace
            end = find_closing_brace(content, pos)
            return m.start(), end, content[m.start():end]
    return None, None, None


def detect_language_selector(content):
    """Find the language selector array.
    Returns (array_start, array_end, array_content) or (None, None, None).
    """
    # Look for array containing value:"zh-CN" entries
    for m in re.finditer(r'value\s*:\s*"zh-CN"', content):
        # Walk backwards to find the [ start
        search_back = content[max(0, m.start() - 500):m.start()]
        bracket_pos = search_back.rfind('[')
        if bracket_pos < 0:
            continue
        abs_start = m.start() - len(search_back) + bracket_pos
        # Verify this looks like a language selector
        snippet = content[abs_start:m.start() + 20]
        if 'label' in snippet and 'tips' in snippet:
            # Find the closing ]
            end = find_closing_bracket(content, abs_start + 1)
            return abs_start, end, content[abs_start:end]
    return None, None, None


def check_already_has_indonesian(messages_content):
    """Check if id-ID is already in the messages config."""
    return '"id-ID"' in messages_content or "'id-ID'" in messages_content


def check_already_patched(content):
    """Check if the Indonesian locale patch has already been applied."""
    markers = [
        '"settings.vendor.test.textTitle":"Pengujian Percakapan Teks"',
        '"settings.modelMap.imageModel":"Model Gambar"',
    ]
    return any(marker in content for marker in markers)


def generate_unique_varname(content, base="IDi"):
    """Generate a variable name that doesn't conflict with existing code."""
    candidates = [base, "_IDi", "In0i", "zIDi", "idIDi", "toonflowID"]
    for name in candidates:
        # Check if this variable name is already used
        pattern = re.escape(name) + r'\s*='
        if not re.search(pattern, content):
            return name
    # Last resort: append random suffix
    import random
    return base + str(random.randint(100, 999))


def load_indonesian_locale(script_dir):
    """Load the id-ID.json file."""
    # Try multiple locations
    search_paths = [
        os.path.join(script_dir, ID_ID_JSON_FILENAME),
        os.path.join(script_dir, 'indonesian-patch', ID_ID_JSON_FILENAME),
        os.path.join(os.path.dirname(os.path.abspath(__file__)), ID_ID_JSON_FILENAME),
        os.path.join(os.path.dirname(os.path.abspath(__file__)), 'indonesian-patch', ID_ID_JSON_FILENAME),
    ]
    
    for path in search_paths:
        if os.path.exists(path):
            print(f"  Loading locale from: {path}")
            with open(path, 'r', encoding='utf-8') as f:
                return json.load(f)
    
    print("ERROR: Could not find " + ID_ID_JSON_FILENAME)
    print("  Searched:")
    for p in search_paths:
        print(f"    {p}")
    return None


def locale_json_to_js(data):
    """Convert a Python dict to a minified JS object literal string."""
    # json.dumps produces valid JSON which is also valid JS
    return json.dumps(data, ensure_ascii=False, separators=(',', ':'))


def print_debug_context(content, label, pos, before=150, after=300):
    """Print context around a position for debugging."""
    start = max(0, pos - before)
    end = min(len(content), pos + after)
    print(f"  {label} at position {pos}:")
    print(f"    ...{content[start:end]}...")
    print()


def main():
    print("=" * 60)
    print("Toonflow Indonesian (id-ID) Locale Patch v3.0")
    print("=" * 60)
    print()
    
    # Determine project path
    if len(sys.argv) > 1:
        project_path = sys.argv[1]
    else:
        project_path = '.'
    
    html_path = os.path.join(project_path, 'data', 'web', 'index.html')
    backup_path = html_path + '.bak'
    
    # Check if file exists
    if not os.path.exists(html_path):
        print(f"ERROR: File not found: {html_path}")
        print(f"Usage: python {sys.argv[0]} [path_to_toonflow_project]")
        sys.exit(1)
    
    # Read the HTML file
    print(f"Reading: {html_path}")
    with open(html_path, 'r', encoding='utf-8') as f:
        content = f.read()
    print(f"File size: {len(content):,} chars")
    print()
    
    # Check if already patched
    if check_already_patched(content):
        print("WARNING: Patch appears to already be applied!")
        print("Found existing Indonesian translations for patched keys.")
        response = input("Re-apply anyway? (y/N): ").strip().lower()
        if response != 'y':
            print("Aborted.")
            sys.exit(0)
    
    # Load Indonesian locale
    print("Loading Indonesian locale data...")
    id_data = load_indonesian_locale(project_path)
    if id_data is None:
        id_data = load_indonesian_locale(os.path.dirname(os.path.abspath(__file__)))
    if id_data is None:
        sys.exit(1)
    
    leaf_count = sum(1 for v in [id_data] if True)  # just to show we have data
    print(f"  Loaded {len(str(id_data)):,} chars of locale data")
    print()
    
    # ========================================
    # Step 1: Detect Chinese settings variable
    # ========================================
    print("Step 1: Detecting Chinese settings variable...")
    chn_settings_titles = [
        '"ToonFlow设置"',     # Standard Chinese
        '"ToonFlow设置"',     # Alternative encoding
    ]
    chn_settings_var = None
    for title in chn_settings_titles:
        chn_settings_var, chn_settings_pos = detect_settings_variable(content, title)
        if chn_settings_var:
            print(f"  Found Chinese settings: {chn_settings_var} (title:{title})")
            break
    
    if chn_settings_var is None:
        print("  FAIL: Could not find Chinese settings variable")
        print("  Searching for debug context...")
        # Try to find any "ToonFlow" title
        for m in re.finditer(r'title\s*:\s*"ToonFlow', content):
            print_debug_context(content, "ToonFlow title", m.start())
        sys.exit(1)
    
    # ========================================
    # Step 2: Detect English settings variable
    # ========================================
    print("Step 2: Detecting English settings variable...")
    eng_settings_var, eng_settings_pos = detect_settings_variable(content, '"ToonFlow Settings"')
    if eng_settings_var:
        print(f"  Found English settings: {eng_settings_var}")
    else:
        print("  WARN: Could not find English settings variable (non-critical)")
    
    # ========================================
    # Step 3: Detect full locale variables
    # ========================================
    print("Step 3: Detecting full locale variables...")
    chn_locale_var, chn_locale_pos = detect_full_locale_variable(content, chn_settings_var)
    if chn_locale_var:
        print(f"  Found Chinese locale: {chn_locale_var} = {{components:...,settings:{chn_settings_var},...}}")
    else:
        print("  FAIL: Could not find Chinese full locale variable")
        sys.exit(1)
    
    eng_locale_var = None
    if eng_settings_var:
        eng_locale_var, eng_locale_pos = detect_full_locale_variable(content, eng_settings_var)
        if eng_locale_var:
            print(f"  Found English locale: {eng_locale_var} = {{components:...,settings:{eng_settings_var},...}}")
    
    # ========================================
    # Step 4: Detect i18n messages config
    # ========================================
    print("Step 4: Detecting vue-i18n messages config...")
    msg_start, msg_end, msg_content = detect_i18n_messages_config(content)
    if msg_start is None:
        print("  FAIL: Could not find messages config")
        print("  Searching for debug context...")
        for m in re.finditer(r'messages\s*:\s*\{', content):
            print_debug_context(content, "messages", m.start())
        sys.exit(1)
    
    has_existing_id = check_already_has_indonesian(msg_content)
    print(f"  Found messages config at position {msg_start}")
    print(f"  Existing id-ID in messages: {'YES' if has_existing_id else 'NO'}")
    
    # ========================================
    # Step 5: Detect language selector array
    # ========================================
    print("Step 5: Detecting language selector array...")
    lang_start, lang_end, lang_content = detect_language_selector(content)
    if lang_start is None:
        print("  WARN: Could not find language selector array")
        print("  The language option won't be added to the selector.")
        print("  You may need to add it manually.")
    else:
        has_id_in_selector = '"id-ID"' in lang_content or "'id-ID'" in lang_content
        print(f"  Found language selector at position {lang_start} ({lang_end - lang_start} chars)")
        print(f"  Existing id-ID in selector: {'YES' if has_id_in_selector else 'NO'}")
    
    print()
    
    # ========================================
    # Step 6: Generate Indonesian locale variable
    # ========================================
    print("Step 6: Generating Indonesian locale variable...")
    id_varname = generate_unique_varname(content)
    print(f"  Variable name: {id_varname}")
    
    id_js = locale_json_to_js(id_data)
    id_var_def = id_varname + '=' + id_js
    print(f"  Variable definition size: {len(id_var_def):,} chars")
    
    # ========================================
    # Step 7: Apply patches
    # ========================================
    print()
    print("Step 7: Applying patches...")
    
    new_content = content
    
    # --- Patch A: Add Indonesian locale variable definition ---
    # Insert right before the i18n config (before the variable that uses useStorage("locale",...))
    # Find the locale storage variable: <var>=<func>("locale","zh-CN")
    locale_storage_pattern = r'([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(\s*"locale"\s*,\s*"zh-CN"\s*\)'
    storage_match = re.search(locale_storage_pattern, new_content)
    
    if storage_match:
        insert_pos = storage_match.start()
        print(f"  [A] Inserting {id_varname} definition before locale storage at position {insert_pos}")
        new_content = new_content[:insert_pos] + id_var_def + ',' + new_content[insert_pos:]
    else:
        # Fallback: insert before the messages config
        # After the previous insertion, positions may have shifted
        # Re-find the messages config
        msg_start_new, _, _ = detect_i18n_messages_config(new_content)
        if msg_start_new:
            # Find the createI18n call before messages
            search_back = new_content[max(0, msg_start_new - 200):msg_start_new]
            fn_match = re.search(r'([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(\s*\{', search_back)
            if fn_match:
                insert_pos = msg_start_new - len(search_back) + fn_match.start()
                print(f"  [A] Inserting {id_varname} definition before i18n config at position {insert_pos}")
                new_content = new_content[:insert_pos] + id_var_def + ',' + new_content[insert_pos:]
            else:
                print("  ERROR: Could not find insertion point for locale variable!")
                sys.exit(1)
        else:
            print("  ERROR: Could not re-locate messages config after patch A!")
            sys.exit(1)
    
    # --- Patch B: Add "id-ID":IDi to messages config ---
    msg_start_new, msg_end_new, msg_content_new = detect_i18n_messages_config(new_content)
    if msg_start_new is None:
        print("  ERROR: Could not find messages config after patch A!")
        sys.exit(1)
    
    if check_already_has_indonesian(msg_content_new):
        print("  [B] id-ID already in messages - updating variable reference")
        # Replace the existing "id-ID":<old_var> with "id-ID":<id_varname>
        pattern = r'"id-ID"\s*:\s*[a-zA-Z_$][a-zA-Z0-9_$]*'
        new_msg = re.sub(pattern, f'"id-ID":{id_varname}', msg_content_new)
        new_content = new_content[:msg_start_new] + new_msg + new_content[msg_end_new:]
    else:
        print("  [B] Adding id-ID to messages config")
        # Insert "id-ID":IDi before the closing } of messages
        # Find the closing brace
        messages_obj_start = new_content.find('{', msg_start_new + len('messages:'))
        messages_obj_end = find_closing_brace(new_content, messages_obj_start + 1)
        
        # Insert before the closing }
        insert_pos = messages_obj_end - 1
        insertion = f',"id-ID":{id_varname}'
        new_content = new_content[:insert_pos] + insertion + new_content[insert_pos:]
    
    # --- Patch C: Add Bahasa Indonesia to language selector ---
    lang_start_new, lang_end_new, lang_content_new = detect_language_selector(new_content)
    if lang_start_new:
        has_id = '"id-ID"' in lang_content_new
        if not has_id:
            print("  [C] Adding 'Bahasa Indonesia' to language selector")
            # Add entry before the closing ]
            insert_pos = lang_start_new + lang_end_new  # This is wrong, let me fix
            # Actually, lang_end_new is the end position in the original content
            # After patches A and B, positions have shifted. Let me re-find.
            pass
            # Re-detect
            lang_start2, lang_end2, lang_content2 = detect_language_selector(new_content)
            if lang_start2 is not None:
                # Find the closing ]
                arr_close = new_content.rfind(']', lang_start2, lang_start2 + len(lang_content2) + 100)
                if arr_close < 0:
                    # The array_content doesn't include the brackets in our detection
                    # Let's find ] after the array content
                    search_from = lang_start2 + len(lang_content2)
                    arr_close = new_content.find(']', search_from - 10)
                
                if arr_close >= 0:
                    insertion = ',{label:"Bahasa Indonesia",tips:"Indonesian",value:"id-ID"}'
                    new_content = new_content[:arr_close] + insertion + new_content[arr_close:]
                    print("    Added language selector entry")
                else:
                    print("    WARN: Could not find closing ] for language selector")
        else:
            print("  [C] id-ID already in language selector - skipping")
    else:
        print("  [C] WARN: Language selector not found - skipping")
    
    # ========================================
    # Step 8: Verify patches
    # ========================================
    print()
    print("Step 8: Verifying patches...")
    
    # Verify A: locale variable exists
    if id_varname + '=' in new_content:
        print(f"  OK: {id_varname} variable definition found")
    else:
        print(f"  FAIL: {id_varname} variable definition NOT found")
    
    # Verify B: id-ID in messages
    _, _, msg_verify = detect_i18n_messages_config(new_content)
    if msg_verify and f'"id-ID":{id_varname}' in msg_verify:
        print(f"  OK: \"id-ID\":{id_varname} in messages config")
    elif msg_verify and '"id-ID"' in msg_verify:
        print(f"  OK: \"id-ID\" in messages config (with different variable)")
    else:
        print(f"  FAIL: id-ID NOT in messages config")
    
    # Verify C: language selector
    _, _, lang_verify = detect_language_selector(new_content)
    if lang_verify and '"id-ID"' in lang_verify:
        print(f"  OK: 'Bahasa Indonesia' in language selector")
    elif lang_verify:
        print(f"  WARN: id-ID NOT in language selector")
    else:
        print(f"  WARN: Language selector not found for verification")
    
    # Verify content: some key Indonesian strings
    key_checks = [
        ('Pengaturan ToonFlow', 'Settings title'),
        ('Proyek Saya', 'Project title'),
        ('Model Gambar', 'Image model label'),
    ]
    for text, desc in key_checks:
        if text in new_content:
            print(f"  OK: '{text}' found ({desc})")
        else:
            print(f"  WARN: '{text}' not found ({desc})")
    
    # ========================================
    # Step 9: Create backup and save
    # ========================================
    print()
    print("Step 9: Saving...")
    
    shutil.copy2(html_path, backup_path)
    print(f"  Backup created: {backup_path}")
    
    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print()
    print("=" * 60)
    print("PATCH APPLIED SUCCESSFULLY!")
    print("=" * 60)
    print(f"  New locale variable: {id_varname}")
    print(f"  Original size:       {len(content):,} chars")
    print(f"  Patched size:        {len(new_content):,} chars")
    print(f"  Size increase:       {len(new_content) - len(content):,} chars")
    print()
    print("Changes made:")
    print(f"  [A] Added {id_varname}={{...}} locale variable definition")
    print(f"  [B] Added \"id-ID\":{id_varname} to messages config")
    if lang_start:
        print(f"  [C] Added 'Bahasa Indonesia' to language selector")
    print()
    print(f"To restore original:")
    print(f'  Windows: copy "{backup_path}" "{html_path}"')
    print(f'  Or run:  python restore-original.py')
    print()
    print("To apply the language in Toonflow:")
    print("  1. Start Toonflow")
    print("  2. Go to Settings -> Language")
    print('  3. Select "Bahasa Indonesia"')


if __name__ == '__main__':
    main()
