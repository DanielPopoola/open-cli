const chalk = require('chalk');

/**
 * Retry handler with exponential backoff
 */
class RetryHandler {
  constructor(maxRetries = 3, baseDelay = 1000) {
    this.maxRetries = maxRetries;
    this.baseDelay = baseDelay; // Base delay in milliseconds
  }

  /**
   * Execute a function with retry logic
   * @param {Function} asyncFn - The async function to retry
   * @param {string} operation - Description of the operation (for logging)
   * @returns {Promise} The result of the function
   */
  async executeWithRetry(asyncFn, operation = 'operation') {
    let lastError;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        // Try to execute the function
        return await asyncFn();
        
      } catch (error) {
        lastError = error;
        
        // Don't retry on certain types of errors
        if (this.shouldNotRetry(error)) {
          throw error;
        }
        
        // If this was our last attempt, throw the error
        if (attempt === this.maxRetries) {
          throw error;
        }
        
        // Calculate delay with exponential backoff
        const delay = this.calculateDelay(attempt);
        
        // Show retry message
        this.showRetryMessage(attempt, this.maxRetries, delay, error, operation);
        
        // Wait before retrying
        await this.sleep(delay);
      }
    }
    
    // This should never be reached, but just in case
    throw lastError;
  }

  /**
   * Determine if we should retry based on the error type
   * @param {Error} error - The error that occurred
   * @returns {boolean} True if we should NOT retry
   */
  shouldNotRetry(error) {
    // Don't retry on authentication errors
    if (error.response && error.response.status === 401) {
      return true;
    }
    
    // Don't retry on bad request errors (invalid model, etc.)
    if (error.response && error.response.status === 400) {
      return true;
    }
    
    // Don't retry on quota exceeded (different from rate limiting)
    if (error.response && error.response.status === 402) {
      return true;
    }
    
    // Retry on network errors, rate limits, and server errors
    return false;
  }

  /**
   * Calculate delay with exponential backoff and jitter
   * @param {number} attempt - Current attempt number (1-based)
   * @returns {number} Delay in milliseconds
   */
  calculateDelay(attempt) {
    // Exponential backoff: baseDelay * 2^(attempt-1)
    const exponentialDelay = this.baseDelay * Math.pow(2, attempt - 1);
    
    // Add jitter (randomness) to prevent thundering herd
    const jitter = Math.random() * 0.3 * exponentialDelay; // ±30% jitter
    
    return Math.floor(exponentialDelay + jitter);
  }

  /**
   * Show a user-friendly retry message
   * @param {number} attempt - Current attempt number
   * @param {number} maxRetries - Maximum number of retries
   * @param {number} delay - Delay before next retry
   * @param {Error} error - The error that occurred
   * @param {string} operation - Description of the operation
   */
  showRetryMessage(attempt, maxRetries, delay, error, operation) {
    const retryCount = attempt;
    const remaining = maxRetries - attempt;
    
    console.log(chalk.yellow(`\n⚠️  ${operation} failed (attempt ${retryCount}/${maxRetries})`));
    
    // Show specific error type and detailed info for debugging
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      
      if (status === 429) {
        console.log(chalk.yellow('   Rate limit exceeded'));
      } else if (status >= 500) {
        console.log(chalk.yellow('   Server error'));
      } else {
        console.log(chalk.yellow(`   API error (${status})`));
      }
      
      // Show more detailed error info for debugging
      if (data && data.error) {
        console.log(chalk.red(`   Details: ${data.error.message || JSON.stringify(data.error)}`));
      }
    } else if (error.request) {
      console.log(chalk.yellow('   Network connection issue'));
      console.log(chalk.red(`   Details: ${error.message}`));
    } else {
      console.log(chalk.yellow(`   ${error.message}`));
    }
    
    if (remaining > 0) {
      const seconds = (delay / 1000).toFixed(1);
      console.log(chalk.gray(`   Retrying in ${seconds}s... (${remaining} attempts left)`));
      
      // Show a progress indicator
      this.showRetryProgress(delay);
    } else {
      // This was the last attempt - show full error for debugging
      console.log(chalk.red('\n🔍 Final error details:'));
      if (error.response) {
        console.log(chalk.red(`   Status: ${error.response.status}`));
        console.log(chalk.red(`   Headers: ${JSON.stringify(error.response.headers)}`));
        console.log(chalk.red(`   Data: ${JSON.stringify(error.response.data)}`));
      } else {
        console.log(chalk.red(`   Full error: ${error.message}`));
        console.log(chalk.red(`   Stack: ${error.stack?.split('\n')[0]}`));
      }
    }
  }

  /**
   * Show a progress indicator while waiting
   * @param {number} delay - Delay in milliseconds
   */
  async showRetryProgress(delay) {
    const steps = 10;
    const stepDelay = delay / steps;
    
    process.stdout.write(chalk.gray('   Progress: '));
    
    for (let i = 0; i < steps; i++) {
      await this.sleep(stepDelay);
      process.stdout.write(chalk.gray('█'));
    }
    
    process.stdout.write('\n');
  }

  /**
   * Sleep for a given number of milliseconds
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise} Promise that resolves after the delay
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get user-friendly error message
   * @param {Error} error - The error object
   * @returns {string} User-friendly error message
   */
  getFriendlyErrorMessage(error) {
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.error?.message || 'Unknown error';
      
      switch (status) {
        case 401:
          return 'Authentication failed. Check your API key.';
        case 400:
          return 'Invalid request. Check your model name or message format.';
        case 402:
          return 'Insufficient credits. Check your OpenRouter account balance.';
        case 429:
          return 'Rate limit exceeded. This usually resolves quickly.';
        case 500:
        case 502:
        case 503:
        case 504:
          return 'Server error. This is usually temporary.';
        default:
          return `API error (${status}): ${message}`;
      }
    } else if (error.request) {
      return 'Network connection failed. Check your internet connection.';
    } else {
      return `Request error: ${error.message}`;
    }
  }
}

module.exports = RetryHandler;