#!/usr/bin/env node

const { Command } = require('commander');
const readline = require('readline');
const ApiClient = require('../lib/api-client');
const config = require('../lib/config');
const { stdout } = require('process');

// Set up command line interface
const program = new Command();

program
  .name('open-cli')
  .description('CLI for OpenRouter AI models with project context')
  .version('0.1.0')
  .requiredOption('-m, --model <model>', 'AI model to use (e.g., openai/gpt-oss-20b)')
  .option('-q, --question <question...>', 'Ask a single question and exit')
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
        let question;
        if (options.question) {
        // Question provided as command line argument
        question = options.question.join(' ');
        } else {
        // Ask for question interactively
        question = await getUserInput('\n💭 What would you like to know? ');
        }

        if (!question) {
            console.log('No question provided. Goodbye! 👋');
            return;
        }

        // Send question to AI
        console.log('\n' + '='.repeat(50));
        const response = await apiClient.sendMessage(options.model, question);

        // Display response
        console.log('\n🤖 Response:');
        console.log(response);
        console.log('\n' + '='.repeat(50));

    } catch (error) {
        console.error('\n❌ Unexpected error:', error.message);
        process.exit(1);
    }
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