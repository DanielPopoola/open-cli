#!/usr/bin/env node

const { Command } = require('commander');
const readline = require('readline');
const ApiClient = require('../lib/api-client');
const ChatSession = require('../lib/chat');
const config = require('../lib/config');

// Set up command line interface
const program = new Command();

program
  .name('open-cli')
  .description('CLI for OpenRouter AI models with project context')
  .version('0.1.0')
  .requiredOption('-m, --model <model>', 'AI model to use (e.g., openai/gpt-oss-20b)')
  .option('-q, --question <question...>', 'Ask a single question and exit')
  .option('-c, --chat', 'Start interactive chat mode (default if no question provided)')
  .option('--debug', 'Enable debug mode')
  .parse();

const options = program.opts();

/**
 * Get user input from the command line
 * @param {string} prompt - The prompt to show the user
 * @returns {Promise<string>} The user's input
 */
function getUserInput(prompt) {
    const rl = readline.createInterface({
        input: process.stdin,
        ouptut: process.stdout
    });

    return new Promise((resolve) => {
        rl.question(prompt, (answer) => {
        rl.close();
        resolve(answer.trim());
        });
    });
}

/**
 * Main application logic
 */

async function main() {
    try {
        // Show welcome message
        console.log('🚀 Open CLI - OpenRouter AI Assistant');
        console.log(`📱 Using model: ${options.model}`);

        // Validate API key format
        if (!config.isValidApiKey()) {
        console.error('❌ API key format looks invalid (should start with "sk-")');
        process.exit(1);
        }

        // Initialize API client
        const apiClient = new ApiClient();

        // Get user's question
        if (options.question) {
            // Single question mode
            await handleSingleQuestion(apiClient, options.question);
        } else {
            // Interactive chat mode
            await startChatMode(apiClient);
        }

    } catch (error) {
        console.error('\n❌ Unexpected error:', error.message);
        process.exit(1);
    }
}

/**
 * Handle a single question and exit
 * @param {ApiClient} apiClient - The API client
 * @param {string} question - The question to ask
 */

async function handleSingleQuestion(apiClient, question) {
    console.log('\n' + '='.repeat(50));
    console.log('💭 Question:', question);
    
    question = options.question.join(' ');
    const response = await apiClient.sendMessage(options.model, question);
  
    console.log('\n🤖 Response:');
    console.log(response);
    console.log('\n' + '='.repeat(50));
    
}

/**
 * Start interactive chat mode
 * @param {ApiClient} apiClient - The API client
 */
async function startChatMode(apiClient) {
  const chatSession = new ChatSession(apiClient, options.model);
  chatSession.start();
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n\n👋 Goodbye!');
  process.exit(0);
});

// Run the application
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});