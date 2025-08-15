const axios = require('axios');
const config = require('./config');

/**
 * OpenRouter API client
 */
class ApiClient{
    constructor() {
        this.baseURL = 'https://openrouter.ai/api/v1';
        this.apiKey = config.getApiKey();

        // Get project details from package.json
        const packageJson = require('../package.json');
        const projectName = packageJson.name || 'open-cli';
        const projectRepo = packageJson.repository?.url || 'https://github.com/404';


        // Set up axios with default headers
        this.client = axios.create({
        baseURL: this.baseURL,
        headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': `${projectRepo}`,
            'X-Title': `${projectName}`
        },
        timeout: 30000
        });
    }

    /**
   * Send a message to the AI model
   * @param {string} model - The model to use (e.g., 'openai/gpt-oss-20b')
   * @param {string} message - The user's message
   * @returns {Promise<string>} The AI's response
   */
  async sendMessage(model, message) {
    try {
      console.log(`Asking ${model}...`);
      
      const requestData = {
        model: model,
        messages: [
          {
            role: 'user',
            content: message
          }
        ]
      };

      const response = await this.client.post('/chat/completions', requestData);
      
      // Extract the AI's response
      const aiResponse = response.data.choices[0].message.content;
      return aiResponse;
      
    } catch (error) {
      this.handleApiError(error);
    }
  }

  /**
   * Send a message with full conversation history (for chat sessions)
   * @param {string} model - The model to use
   * @param {Array} messageHistory - Array of {role: 'user'|'assistant', content: string}
   * @returns {Promise<string>} The AI's response
   */
  async sendMessageWithHistory(model, messageHistory) {
    try {
      const requestData = {
        model: model,
        messages: messageHistory
      };

      const response = await this.client.post('/chat/completions', requestData);

      // Extract the AI's response
      const aiResponse = response.data.choices[0].message.content;
      return aiResponse;

    } catch (error){
      this.handleApiError(error);
    }
  }
  
  /**
   * Handle API errors with helpful messages
   * @param {Error} error - The error object
   */
  handleApiError(error) {
    if (error.response) {
      // The request was made and the server responded with an error status
      const status = error.response.status;
      const message = error.response.data?.error?.message || 'Unknown error';
      
      console.error(`\n❌ API Error (${status}): ${message}`);
      
      if (status === 401) {
        console.error('Check your API key is correct and has sufficient credits.');
      } else if (status === 400) {
        console.error('Check that the model name is correct.');
        console.error('Valid format: "provider/model-name" (e.g., "openai/gpt-oss-20b")');
      } else if (status === 429) {
        console.error('Rate limit exceeded. Please wait a moment and try again.');
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.error('\n❌ Network Error: Unable to reach OpenRouter API');
      console.error('Check your internet connection.');
    } else {
      // Something happened in setting up the request
      console.error('\n❌ Request Error:', error.message);
    }
    
    process.exit(1);
  }

  /**
   * Test the API connection
   * @returns {Promise<boolean>} True if connection successful
   */
  async testConnection() {
    try {
      await this.sendMessage('openai/gpt-oss-20b', 'Hello');
      return true;
    } catch (error) {
      return false;
    }
  }
}

module.exports = ApiClient;