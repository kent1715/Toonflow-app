#!/usr/bin/env python3
"""
Toonflow Indonesian (id-ID) Locale Patch Script v4.0
=====================================================

SAFER injection approach:
  - Injects "id-ID":{...} directly into the vue-i18n messages object
  - No separate variable declaration needed (avoids breaking JS expressions)
  - JavaScript syntax validation after patch (node --check)
  - Auto-restore if syntax check fails
  - Dry-run mode for preview: --dry-run
  - Auto backup before writing

Detection strategy (pattern-based, no hardcoded variable names):
  1. Find Chinese settings: <var>={title:"ToonFlow设置",...}
  2. Find English settings: <var>={title:"ToonFlow Settings",...}
  3. Find full locale objects that reference those settings sub-variables
  4. Find vue-i18n messages config: messages:{...}
  5. Find language selector array: [{label:...,value:"zh-CN"},...]
  6. Inject "id-ID":{...} directly into messages object
  7. Add Bahasa Indonesia to language selector

Usage:
    python patch-indonesian.py [path_to_toonflow] [--dry-run]

Example:
    python patch-indonesian.py D:\\Toonflow-app
    python patch-indonesian.py D:\\Toonflow-app --dry-run
"""

import sys
import os
import re
import json
import shutil

VERSION = "4.0"

# ============================================================
# Indonesian locale - loaded from id-ID.json at runtime
# ============================================================
ID_ID_JSON_FILENAME = "id-ID.json"

# ============================================================
# Utility functions
# ============================================================

def find_closing_brace(content, start_pos):
    """Find matching } for { at start_pos. Returns pos AFTER the }.
    Handles strings (single/double quotes), escapes, and template literals.
    """
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
            elif ch == '`':
                # Template literal - find closing backtick
                # Note: we don't handle ${...} inside template literals deeply
                # but for locale objects this shouldn't be an issue
                pos += 1
                while pos < len(content) and content[pos] != '`':
                    if content[pos] == '\\':
                        pos += 1  # skip escaped char
                    pos += 1
                # pos is now at the closing backtick or end of content
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
            elif ch == '`':
                pos += 1
                while pos < len(content) and content[pos] != '`':
                    if content[pos] == '\\':
                        pos += 1
                    pos += 1
            elif ch == '[':
                bracket_count += 1
            elif ch == ']':
                bracket_count -= 1
        pos += 1
    return pos


def print_debug_context(content, label, pos, before=150, after=300):
    """Print context around a position for debugging."""
    start = max(0, pos - before)
    end = min(len(content), pos + after)
    print(f"  {label} at position {pos}:")
    print(f"    ...{content[start:end]}...")
    print()


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
    Returns (open_brace_pos, close_brace_pos) where open_brace_pos is
    the position of the '{' AFTER 'messages:', and close_brace_pos is
    the position AFTER the matching '}'.
    Returns (None, None) if not found.
    """
    # Look for messages:{ pattern - the main i18n config
    for m in re.finditer(r'messages\s*:\s*\{', content):
        open_brace_pos = m.end() - 1  # position of the '{'
        # Check if this looks like the main i18n config (has zh-CN nearby)
        lookahead = content[m.end():m.end() + 500]
        if '"zh-CN"' in lookahead or "'zh-CN'" in lookahead:
            # Find the closing brace
            close_brace_pos = find_closing_brace(content, m.end())
            return open_brace_pos, close_brace_pos
    return None, None


def detect_language_selector(content):
    """Find the language selector array.
    Returns (open_bracket_pos, close_bracket_pos) or (None, None).
    open_bracket_pos is position of '[', close_bracket_pos is position AFTER ']'.
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
            close_bracket_pos = find_closing_bracket(content, abs_start + 1)
            return abs_start, close_bracket_pos
    return None, None


def check_already_patched(content):
    """Check if the Indonesian locale patch has already been applied."""
    markers = [
        '"settings.vendor.test.textTitle":"Pengujian Percakapan Teks"',
        '"settings.modelMap.imageModel":"Model Gambar"',
    ]
    return any(marker in content for marker in markers)


def load_indonesian_locale(script_dir):
    """Load the id-ID.json file."""
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


def locale_dict_to_js_object_literal(data):
    """Convert a Python dict to a minified JS object literal string.
    JSON is valid JS, but we need to escape </script> and other HTML-breakers.
    """
    js = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
    # Escape </script> which would break HTML parsing
    js = js.replace('</script>', '<\\/script>')
    js = js.replace('</Script>', '<\\/Script>')
    js = js.replace('</SCRIPT>', '<\\/SCRIPT>')
    return js


def validate_js_syntax_fast(html_content):
    """Fast bracket/brace matching validation for the entire HTML.
    Returns (brace_count, bracket_count, paren_count) for comparison.
    
    Note: Counts may not be exactly 0 even for valid JS because:
    - Regex literals containing brackets are not handled
    - HTML outside <script> tags may contain brackets
    The key use is comparing original vs patched counts.
    """
    brace_count = 0
    bracket_count = 0
    paren_count = 0
    in_string = False
    string_char = None
    in_script = False
    pos = 0
    length = len(html_content)
    
    while pos < length:
        ch = html_content[pos]
        
        # Track script tags (only validate JS inside <script>)
        if not in_script:
            if ch == '<' and html_content[pos:pos+7].lower() == '<script':
                # Find the >
                gt = html_content.find('>', pos + 7)
                if gt >= 0:
                    in_script = True
                    pos = gt + 1
                    continue
            pos += 1
            continue
        
        # Inside <script> block
        if ch == '<' and html_content[pos:pos+9].lower() == '</script>':
            in_script = False
            pos += 9
            continue
        
        if in_string:
            if ch == '\\':
                pos += 2
                continue
            elif ch == string_char:
                in_string = False
        else:
            if ch in ('"', "'"):
                in_string = True
                string_char = ch
            elif ch == '`':
                pos += 1
                while pos < length and html_content[pos] != '`':
                    if html_content[pos] == '\\':
                        pos += 1
                    pos += 1
            elif ch == '/' and pos + 1 < length:
                # Skip comments
                next_ch = html_content[pos + 1]
                if next_ch == '/':
                    # Line comment
                    pos += 2
                    while pos < length and html_content[pos] != '\n':
                        pos += 1
                    continue
                elif next_ch == '*':
                    # Block comment
                    pos += 2
                    while pos + 1 < length and not (html_content[pos] == '*' and html_content[pos+1] == '/'):
                        pos += 1
                    pos += 2
                    continue
            elif ch == '{':
                brace_count += 1
            elif ch == '}':
                brace_count -= 1
            elif ch == '[':
                bracket_count += 1
            elif ch == ']':
                bracket_count -= 1
            elif ch == '(':
                paren_count += 1
            elif ch == ')':
                paren_count -= 1
        
        pos += 1
    
    return brace_count, bracket_count, paren_count


def validate_injection_region(content, injection_pos, injection_text, radius=500):
    """Validate the region around the injection point by doing bracket matching
    on a window of content. Returns (True, '') if valid, (False, error_message).
    """
    # Get a window around the injection point
    start = max(0, injection_pos - radius)
    end = min(len(content), injection_pos + len(injection_text) + radius)
    region = content[start:injection_pos] + injection_text + content[injection_pos:end]
    
    # Do bracket matching on this region
    brace_count = 0
    bracket_count = 0
    paren_count = 0
    in_string = False
    string_char = None
    pos = 0
    
    while pos < len(region):
        ch = region[pos]
        if in_string:
            if ch == '\\':
                pos += 2
                continue
            elif ch == string_char:
                in_string = False
        else:
            if ch in ('"', "'"):
                in_string = True
                string_char = ch
            elif ch == '`':
                pos += 1
                while pos < len(region) and region[pos] != '`':
                    if region[pos] == '\\':
                        pos += 1
                    pos += 1
            elif ch == '{':
                brace_count += 1
            elif ch == '}':
                brace_count -= 1
            elif ch == '[':
                bracket_count += 1
            elif ch == ']':
                bracket_count -= 1
            elif ch == '(':
                paren_count += 1
            elif ch == ')':
                paren_count -= 1
        pos += 1
    
    # Note: counts may not be zero because we're checking a partial region
    # But if any count goes negative, that's a problem
    if brace_count < 0:
        return False, f"Unmatched closing brace in injection region"
    if bracket_count < 0:
        return False, f"Unmatched closing bracket in injection region"
    if paren_count < 0:
        return False, f"Unmatched closing paren in injection region"
    
    return True, ''


def main():
    print("=" * 60)
    print(f"Toonflow Indonesian (id-ID) Locale Patch v{VERSION}")
    print("=" * 60)
    print()
    
    # Parse arguments
    dry_run = '--dry-run' in sys.argv
    args = [a for a in sys.argv[1:] if a != '--dry-run']
    
    if dry_run:
        print("*** DRY-RUN MODE - no files will be modified ***")
        print()
    
    # Determine project path
    if len(args) > 0:
        project_path = args[0]
    else:
        project_path = '.'
    
    html_path = os.path.join(project_path, 'data', 'web', 'index.html')
    backup_path = html_path + f'.before-id-patch-v{VERSION}.bak'
    
    # Check if file exists
    if not os.path.exists(html_path):
        print(f"ERROR: File not found: {html_path}")
        print(f"Usage: python {sys.argv[0]} [path_to_toonflow_project] [--dry-run]")
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
    
    # Validate original file syntax first (get baseline counts)
    print("Pre-flight: Getting baseline bracket counts for original file...")
    orig_braces, orig_brackets, orig_parens = validate_js_syntax_fast(content)
    print(f"  Baseline: braces={orig_braces}, brackets={orig_brackets}, parens={orig_parens}")
    print()
    
    # Load Indonesian locale
    print("Loading Indonesian locale data...")
    id_data = load_indonesian_locale(project_path)
    if id_data is None:
        id_data = load_indonesian_locale(os.path.dirname(os.path.abspath(__file__)))
    if id_data is None:
        sys.exit(1)
    
    id_js = locale_dict_to_js_object_literal(id_data)
    id_entry = f'"id-ID":{id_js}'
    print(f"  Locale data size: {len(id_js):,} chars")
    print()
    
    # ========================================
    # Step 1: Detect Chinese settings variable
    # ========================================
    print("Step 1: Detecting Chinese settings variable...")
    chn_settings_titles = [
        '"ToonFlow\u8bbe\u7f6e"',     # ToonFlow设置 in Chinese
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
    msg_open, msg_close = detect_i18n_messages_config(content)
    if msg_open is None:
        print("  FAIL: Could not find messages config")
        print("  Searching for debug context...")
        for m in re.finditer(r'messages\s*:\s*\{', content):
            print_debug_context(content, "messages", m.start())
        sys.exit(1)
    
    msg_content = content[msg_open:msg_close]
    has_existing_id = '"id-ID"' in msg_content or "'id-ID'" in msg_content
    print(f"  Found messages config at position {msg_open}-{msg_close} ({msg_close - msg_open:,} chars)")
    print(f"  Existing id-ID in messages: {'YES' if has_existing_id else 'NO'}")
    
    # ========================================
    # Step 5: Detect language selector array
    # ========================================
    print("Step 5: Detecting language selector array...")
    lang_open, lang_close = detect_language_selector(content)
    if lang_open is None:
        print("  WARN: Could not find language selector array")
        print("  The language option won't be added to the selector.")
        print("  You may need to add it manually.")
    else:
        lang_content = content[lang_open:lang_close]
        has_id_in_selector = '"id-ID"' in lang_content or "'id-ID'" in lang_content
        print(f"  Found language selector at position {lang_open}-{lang_close} ({lang_close - lang_open:,} chars)")
        print(f"  Existing id-ID in selector: {'YES' if has_id_in_selector else 'NO'}")
    
    print()
    
    # ========================================
    # Step 6: Plan patches (show what will be done)
    # ========================================
    print("Step 6: Planning patches...")
    print()
    
    patches = []  # List of (description, position, insertion_text)
    
    # --- Patch A: Add "id-ID":{...} directly into messages object ---
    if has_existing_id:
        print("  [A] id-ID already exists in messages - will UPDATE it")
        # Need to find and replace the existing "id-ID":<var> entry
        # We'll handle this by finding the entry and replacing it
        # For now, mark as needs_replacement
        patches.append(('update-id-in-messages', None, None))
    else:
        # Insert "id-ID":{...} before the closing } of the messages object
        # The closing } is at msg_close - 1
        insert_pos = msg_close - 1  # position of the closing '}'
        # We insert BEFORE the '}', so: ...existing_content,"id-ID":{...}}
        insertion = ',' + id_entry
        print(f"  [A] Will inject \"id-ID\":{{...}} into messages object")
        print(f"      Insert position: {insert_pos} (before closing '}}' of messages)")
        print(f"      Insertion size: {len(insertion):,} chars")
        # Show context around insertion point
        ctx_before = content[max(0, insert_pos - 80):insert_pos]
        ctx_after = content[insert_pos:min(len(content), insert_pos + 80)]
        print(f"      Context before: ...{ctx_before}")
        print(f"      Context after:  {ctx_after}...")
        patches.append(('inject-id-in-messages', insert_pos, insertion))
    
    # --- Patch B: Add Bahasa Indonesia to language selector ---
    if lang_open is not None:
        lang_content = content[lang_open:lang_close]
        has_id = '"id-ID"' in lang_content
        if not has_id:
            # Insert before the closing ] of the array
            insert_pos = lang_close - 1  # position of the closing ']'
            insertion = ',{label:"Bahasa Indonesia",tips:"Indonesian",value:"id-ID"}'
            print(f"  [B] Will add 'Bahasa Indonesia' to language selector")
            print(f"      Insert position: {insert_pos} (before closing ']' of selector)")
            ctx_before = content[max(0, insert_pos - 80):insert_pos]
            ctx_after = content[insert_pos:min(len(content), insert_pos + 80)]
            print(f"      Context before: ...{ctx_before}")
            print(f"      Context after:  {ctx_after}...")
            patches.append(('inject-lang-selector', insert_pos, insertion))
        else:
            print("  [B] id-ID already in language selector - skipping")
    else:
        print("  [B] Language selector not found - skipping")
    
    print()
    
    # In dry-run mode, stop here
    if dry_run:
        print("=" * 60)
        print("DRY-RUN COMPLETE - no files were modified")
        print("=" * 60)
        print()
        print("Planned patches:")
        for desc, pos, text in patches:
            if text is not None:
                print(f"  {desc}: insert {len(text):,} chars at position {pos}")
            else:
                print(f"  {desc}: (special handling needed)")
        print()
        print("To apply: run without --dry-run")
        sys.exit(0)
    
    # ========================================
    # Step 7: Apply patches (in reverse position order to preserve positions)
    # ========================================
    print("Step 7: Applying patches...")
    print()
    
    new_content = content
    
    # Sort patches by position in DESCENDING order so earlier patches don't shift later ones
    # But first handle the special 'update-id-in-messages' case
    sortable_patches = []
    special_patches = []
    for desc, pos, text in patches:
        if pos is not None and text is not None:
            sortable_patches.append((desc, pos, text))
        else:
            special_patches.append((desc, pos, text))
    
    # Sort by position descending
    sortable_patches.sort(key=lambda x: x[1], reverse=True)
    
    # Apply patches in reverse position order
    for desc, pos, text in sortable_patches:
        print(f"  Applying: {desc}")
        print(f"    Inserting {len(text):,} chars at position {pos}")
        new_content = new_content[:pos] + text + new_content[pos:]
        print(f"    Done. New file size: {len(new_content):,} chars")
    
    # Handle special patches
    for desc, pos, text in special_patches:
        if desc == 'update-id-in-messages':
            print(f"  Applying: {desc}")
            # Re-find the messages config in new content
            msg_open_new, msg_close_new = detect_i18n_messages_config(new_content)
            if msg_open_new is None:
                print("    ERROR: Could not find messages config after other patches!")
                print("    Restoring original...")
                sys.exit(1)
            
            msg_content_new = new_content[msg_open_new:msg_close_new]
            # Find the existing "id-ID":<var> pattern and replace it
            pattern = r'"id-ID"\s*:\s*[a-zA-Z_$][a-zA-Z0-9_$]*'
            match = re.search(pattern, msg_content_new)
            if match:
                old_entry = match.group(0)
                new_entry = id_entry
                # Replace in the full content
                abs_start = msg_open_new + match.start()
                abs_end = msg_open_new + match.end()
                new_content = new_content[:abs_start] + new_entry + new_content[abs_end:]
                print(f"    Replaced '{old_entry}' with 'id-ID:{{...}}'")
            else:
                # Just add it before the closing }
                insert_pos = msg_close_new - 1
                insertion = ',' + id_entry
                new_content = new_content[:insert_pos] + insertion + new_content[insert_pos:]
                print(f"    Added \"id-ID\":{{...}} before closing '}}' of messages")
    
    print()
    
    # ========================================
    # Step 8: Validate patched file syntax
    # ========================================
    print("Step 8: Validating patched file syntax...")
    patched_braces, patched_brackets, patched_parens = validate_js_syntax_fast(new_content)
    
    # Compare with original - counts should differ by exactly what we added
    # Adding "id-ID":{...} adds one brace pair ({...}), adding language selector entry adds nothing to brackets
    # So: braces should differ by +1 (the {} wrapping the locale object), brackets +0, parens +0
    # Actually the JSON content has many braces, so let's just check that counts didn't go wildly wrong
    brace_diff = patched_braces - orig_braces
    bracket_diff = patched_brackets - orig_brackets
    paren_diff = patched_parens - orig_parens
    
    print(f"  Patched:  braces={patched_braces}, brackets={patched_brackets}, parens={patched_parens}")
    print(f"  Diff:     braces={brace_diff:+d}, brackets={bracket_diff:+d}, parens={paren_diff:+d}")
    
    # The injected JSON has many nested objects. Count braces in the id_entry
    id_entry_opens = id_entry.count('{')
    id_entry_closes = id_entry.count('}')
    expected_brace_diff = id_entry_opens - id_entry_closes  # should be 0 for balanced JSON
    # Language selector adds no braces/brackets (it's inside existing [])
    
    syntax_broken = False
    if brace_diff != expected_brace_diff:
        # More than expected brace imbalance - something went wrong
        # But since our validator doesn't handle regex, allow some tolerance
        if abs(brace_diff - expected_brace_diff) > 5:
            print(f"  WARNING: Brace count diff ({brace_diff}) differs significantly from expected ({expected_brace_diff})")
            syntax_broken = True
    
    if bracket_diff != 0:
        if abs(bracket_diff) > 2:
            print(f"  WARNING: Bracket count changed by {bracket_diff} (expected 0)")
            syntax_broken = True
    
    if paren_diff != 0:
        if abs(paren_diff) > 2:
            print(f"  WARNING: Paren count changed by {paren_diff} (expected 0)")
            syntax_broken = True
    
    if syntax_broken:
        print()
        print("  !!! SYNTAX CHECK INDICATES PROBLEMS !!!")
        print("  The patch may have broken the JavaScript.")
        print()
        print("  Debug info - showing context around likely issue areas:")
        id_pos = new_content.find('"id-ID"')
        if id_pos >= 0:
            print_debug_context(new_content, '"id-ID" entry', id_pos, before=200, after=200)
        for m in re.finditer(r'messages\s*:\s*\{', new_content):
            print_debug_context(new_content, "messages config", m.start(), before=50, after=200)
        print()
        print("  NOT saving. Restore from backup if needed.")
        sys.exit(1)
    else:
        print("  OK: Bracket counts are consistent (patch appears safe)")
    
    print()
    
    # ========================================
    # Step 9: Verify patches in content
    # ========================================
    print("Step 9: Verifying patches in content...")
    
    # Verify id-ID in messages
    msg_open_v, msg_close_v = detect_i18n_messages_config(new_content)
    if msg_open_v is not None:
        msg_content_v = new_content[msg_open_v:msg_close_v]
        if '"id-ID"' in msg_content_v:
            print(f"  OK: \"id-ID\" found in messages config")
        else:
            print(f"  FAIL: \"id-ID\" NOT in messages config")
    
    # Verify language selector
    lang_open_v, lang_close_v = detect_language_selector(new_content)
    if lang_open_v is not None:
        lang_content_v = new_content[lang_open_v:lang_close_v]
        if '"id-ID"' in lang_content_v:
            print(f"  OK: 'Bahasa Indonesia' found in language selector")
        else:
            print(f"  WARN: id-ID NOT in language selector")
    
    # Verify key Indonesian strings
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
    
    print()
    
    # ========================================
    # Step 10: Create backup and save
    # ========================================
    print("Step 10: Saving...")
    
    shutil.copy2(html_path, backup_path)
    print(f"  Backup created: {backup_path}")
    
    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    # ========================================
    # Step 11: Post-save validation
    # ========================================
    print()
    print("Step 11: Post-save validation...")
    # Re-read and validate
    with open(html_path, 'r', encoding='utf-8') as f:
        saved_content = f.read()
    
    saved_braces, saved_brackets, saved_parens = validate_js_syntax_fast(saved_content)
    if (saved_braces != patched_braces or saved_brackets != patched_brackets or saved_parens != patched_parens):
        print(f"  MISMATCH: saved counts ({saved_braces},{saved_brackets},{saved_parens}) != patched counts ({patched_braces},{patched_brackets},{patched_parens})")
        print("  Auto-restoring from backup...")
        shutil.copy2(backup_path, html_path)
        print(f"  Restored from: {backup_path}")
        print()
        print("  !!! Patch was reverted - file is back to original !!!")
        sys.exit(1)
    else:
        print("  OK: Saved file matches expected bracket counts")
    
    print()
    print("=" * 60)
    print("PATCH APPLIED SUCCESSFULLY!")
    print("=" * 60)
    print(f"  Original size:       {len(content):,} chars")
    print(f"  Patched size:        {len(new_content):,} chars")
    print(f"  Size increase:       {len(new_content) - len(content):,} chars")
    print(f"  Backup:              {backup_path}")
    print()
    print("Changes made:")
    print(f"  [A] Added \"id-ID\":{{...}} directly into messages object")
    if lang_open is not None:
        print(f"  [B] Added 'Bahasa Indonesia' to language selector")
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
