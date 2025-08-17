const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'templates', '.env') });


/**
 * Configuration manager for API keys and settings
 */
class Config{
    constructor() {
        this.apiKey = null;
        this.loadApiKey();
    }

    /**
   * Load API key from environment variables or .env file
   */
    loadApiKey() {
        this.apiKey = process.env.OPENROUTER_API_KEY;

        if (this.apiKey) {
            console.log('API key loaded successfully');
        } else {
            this.showApiKeyError();
        }
    }

    showApiKeyError() {
        console.error('\n❌ OpenRouter API key not found!');
        console.error('\nPlease set your API key using one of these methods:');
        console.error('1. Environment variable: export OPENROUTER_API_KEY="your_key_here"');
        console.error('2. Create .env file: echo "OPENROUTER_API_KEY=your_key_here" > .env');
        console.error('\nGet your API key from: https://openrouter.ai/keys');
        process.exit(1);
    }

    /**
   * Get the API key
   * @returns {string} The API key
   */
    getApiKey(){
        return this.apiKey;
    }

    /**
   * Check if API key is valid (basic format check)
   * @returns {boolean} True if key looks valid
   */
    isValidApiKey() {
        return this.apiKey && this.apiKey.length > 10 && this.apiKey.startsWith('sk-');
    }
}

module.exports = new Config();