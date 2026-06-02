export interface ApiResponse {
  code: number;
  data: any;
  message: string;
}

// Callback sukses
export function success<T>(data: T | null = null, message: string = "Berhasil"): ApiResponse {
  return {
    code: 200,
    data,
    message,
  };
}

// Respons error klien
export function error<T>(message: string = "", data: T | null = null): ApiResponse {
  return {
    code: 400,
    data,
    message,
  };
}
