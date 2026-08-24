export interface ParsedError {
  title: string;
  message: string;
  statusCode?: number;
  errors?: Record<string, string[]>;
}

export const parseApiError = (error: any): ParsedError => {
  if (!error) {
    return {
      title: 'Unknown Error',
      message: 'An unexpected error occurred.'
    };
  }

  // Network or offline error
  if (error.message === 'Network Error' || !error.response) {
    return {
      title: 'Network Error',
      message: 'Could not connect to the server. Please check your internet connection.'
    };
  }

  const status = error.response?.status;
  const data = error.response?.data;

  // 422 Validation errors
  if (status === 422) {
    let message = data?.message || 'Please fix the validation errors.';
    let validationDetails = '';

    if (data?.errors && typeof data.errors === 'object') {
      const errorList = Object.values(data.errors).flat() as string[];
      if (errorList.length > 0) {
        validationDetails = errorList.slice(0, 3).join(' • ');
      }
    }

    return {
      statusCode: 422,
      title: 'Validation Error',
      message: validationDetails || message,
      errors: data?.errors
    };
  }

  // 403 Forbidden
  if (status === 403) {
    return {
      statusCode: 403,
      title: 'Access Forbidden',
      message: data?.error || data?.message || 'You do not have permission to perform this action.'
    };
  }

  // 404 Not Found
  if (status === 404) {
    return {
      statusCode: 404,
      title: 'Not Found',
      message: data?.error || data?.message || 'The requested resource was not found.'
    };
  }

  // 401 Unauthorized
  if (status === 401) {
    return {
      statusCode: 401,
      title: 'Session Expired',
      message: 'Your session has expired. Please log in again.'
    };
  }

  // 419 CSRF / Expired
  if (status === 419) {
    return {
      statusCode: 419,
      title: 'Page Expired',
      message: 'Page has expired. Please refresh and try again.'
    };
  }

  // 429 Rate limit
  if (status === 429) {
    return {
      statusCode: 429,
      title: 'Too Many Requests',
      message: 'Too many requests. Please wait a moment and try again.'
    };
  }

  // 500+ Server error
  if (status >= 500) {
    return {
      statusCode: status,
      title: 'Server Error',
      message: data?.error || data?.message || 'An internal server error occurred. Please try again later.'
    };
  }

  // Fallback
  return {
    statusCode: status,
    title: 'Alert',
    message: data?.error || data?.message || error.message || 'An error occurred.'
  };
};
