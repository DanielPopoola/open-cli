const readline = require('readline');
const chalk = require('chalk');
const { stderr } = require('process');

/**
 * Chat session manager - handles conversation loop and history
 */
class ChatSession {
    constructor(apiClient, model) {
        this.apiClient = apiClient;
        this.model = model;
        this.conversationHistory = [];
        this.isRunning = false;

        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: chalk.cyan('You> ')
        });
        
        this.setupEventHandlers();
    }

    /**
   * Set up event handlers for readline interface
   */
    setupEventHandlers() {
        // Handle each line of user input
        this.rl.on('line', async (input) => {
            const userMessage = input.trim();

            // Check for exit commmands
            if (this.isExitCommand(userMessage)) {
                this.stop();
                return;
            }

            // Skip empty messages
            if (!userMessage) {
                this.rl.prompt();
                return;
            }

            await this.processUserMessage(userMessage);
        });

        this.rl.on('SIGINT', () => {
            console.log('\n\n👋 Chat ended. Goodbye!');
            this.stop();
        });
    }

    /**
   * Check if user wants to exit
   * @param {string} message - User's input
   * @returns {boolean} True if it's an exit command
   */
  isExitCommand(message) {
    const  exitCommands = ['quit', 'exit', 'bye', 'q'];
    return exitCommands.includes(message.toLowerCase());
  }

  /**
   * Process a user message and get AI response
   * @param {string} userMessage - The user's message
   */
  async processUserMessage(userMessage) {
    try {
        this.addToHistory('user', userMessage);

        // Show thinkning indicator
        process.stdout.write(chalk.yellow('Thinking...'));

        const aiResponse = await this.apiClient.sendMessageWithHistory(
            this.model,
            this.conversationHistory
        );

        // Clear the thinking indicator
        process.stdout.write('\r' + ' '.repeat(15) + '\r');

        // Add AI response to history
        this.addToHistory('assistant', aiResponse);

        // Display response
        this.displayAiResponse(aiResponse);

    } catch (error) {
        console.error(chalk.red('\n❌ Error getting response:'), error.message);
    }

    //Show prompt for next message
    this.rl.prompt();
  }

  /**
   * Add a message to conversation history
   * @param {string} role - 'user' or 'assistant'
   * @param {string} content - The message content
   */
  addToHistory(role, content) {
    this.conversationHistory.push({
        role: role,
        content: content,
    });

    // Keep history manageable (last 20 messages)
    // This prevents API calls from getting too long/expensive
    if (this.conversationHistory.length > 20) {
        this.conversationHistory = this.conversationHistory.slice(-20);
    }
  }

  /**
   * Display AI response with nice formatting
   * @param {string} response - The AI's response
   */
  displayAiResponse(response) {
    console.log('\n' + chalk.blue('AI:'));
    console.log(chalk.white(response));
    console.log('\n' + '─'.repeat(50));
  }

  /**
   * Start the chat session
   */
  start() {
    this.isRunning = true;

    // Show welcome message
    console.log(chalk.green('\n🚀 Starting chat session'));
    console.log(chalk.gray(`📱 Model: ${this.model}`));
    console.log(chalk.gray('💡 Type your questions, or "quit" to exit\n'));

    // Show first prompt
    this.rl.prompt();
  }

  /**
   * Stop the chat session
   */
  stop() {
    this.isRunning = false;
    this.rl.close();
    
    // Show session summary
    const messageCount = this.conversationHistory.length;
    if (messageCount > 0) {
      console.log(chalk.green(`\n📊 Session ended - ${messageCount} messages exchanged`));
    }
    
    process.exit(0);
  }

  /**
   * Get conversation history (useful for debugging or export)
   * @returns {Array} The conversation history
   */
  getHistory() {
    return [...this.conversationHistory]; // Return a copy
  }
}

module.exports = ChatSession;