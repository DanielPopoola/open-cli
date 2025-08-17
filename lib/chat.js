const readline = require('readline');
const chalk = require('chalk');
const FileManager = require('./file-manager');
const ContextBuilder = require('./context-builder');

/**
 * Chat session manager - handles conversation loop and history with project context
 */
class ChatSession {
    constructor(apiClient, model) {
        this.apiClient = apiClient;
        this.model = model;
        this.conversationHistory = [];
        this.isRunning = false;

        // Initialize project awareness
        this.fileManager = new FileManager();
        this.contextBuilder = new ContextBuilder(this.fileManager);

        // Scan project on startup
        this.fileManager.scanProject();

        // Set up readline interface for continuous input
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

            // Check for special commands
            if (this.handleSpecialCommands(userMessage)) {
              this.rl.prompt();
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
   * Check if user wants to see project files
   * @param {string} message - User's input
   * @returns {boolean} True if it's a files command
   */
  isFilesCommand(message) {
    const filesCommands = ['files', 'ls', 'list files', 'show files'];
    return filesCommands.includes(message.toLowerCase());
  }

  /**
   * Handle special commands
   * @param {string} userMessage - The user's message
   * @returns {boolean} True if it was a special command (handled)
   */
  handleSpecialCommands(userMessage) {
    if (this.isFilesCommand(userMessage)) {
      this.showProjectFiles();
      return true;
    }
    return false;
  }

  /**
   * Show project files to the user
   */
  showProjectFiles() {
    const files = this.fileManager.getProjectFiles();

    if (files.length === 0) {
      console.log(chalk.yellow('\n📁 No relevant files found in current directory'));
      return;
    }

    console.log(chalk.green(`\n📁 Found ${files.length} project files:`));

    // Group files by directory
    const filesByDir = {};
    for (const file of files) {
      const dir = file.relativePath.includes('/')
        ? file.relativePath.substring(0, file.relativePath.lastIndexOf('/'))
        : '.';

      if (!filesByDir[dir]) {
        filesByDir[dir] = [];
      }
      filesByDir[dir].push(file);
    }


    // Display grouped files
    for (const [dir, dirFiles] of Object.entries(filesByDir)) {
      console.log(chalk.blue(`\n  ${dir}/`));
      for (const file of dirFiles.slice(0, 10)) { // Limit display
        const size = file.size < 1024 ? `${file.size}B` : `${Math.round(file.size/1024)}KB`;
        console.log(chalk.gray(`    ${file.name} (${size})`));
      }
      if (dirFiles.length > 10) {
        console.log(chalk.gray(`    ... and ${dirFiles.length - 10} more`));
      }
    }
    console.log();
  }

  /**
   * Process a user message and get AI response
   * @param {string} userMessage - The user's message
   */
  async processUserMessage(userMessage) {
    try {
      // Build context for this message
      const context = this.contextBuilder.buildContext(userMessage, this.conversationHistory);
      
      // Create the message to send to AI (with context if available)
      const messageWithContext = context ? context + userMessage : userMessage;

      // Add user message to history (without context to keep history clean)
      this.addToHistory('user', userMessage);

      // Show thinking indicator
      process.stdout.write(chalk.yellow('🤖 Thinking...'));

      // Show context indicator if files are included
      if (context) {
        const contextFiles = this.contextBuilder.getCurrentContext();
        process.stdout.write(chalk.gray(` [📁 ${contextFiles.length} files]`));
      }

      // Get AI response with context
      const aiResponse = await this.apiClient.sendMessageWithContext(
        this.model, 
        this.conversationHistory,
        context
      );

      // Clear the thinking indicator
      process.stdout.write('\r' + ' '.repeat(30) + '\r');
      
      // Add AI response to history
      this.addToHistory('assistant', aiResponse);
      
      // Display the response
      this.displayAiResponse(aiResponse);

    } catch (error) {
      console.error(chalk.red('\n❌ Error getting response:'), error.message);
    }

    // Show prompt for next message
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