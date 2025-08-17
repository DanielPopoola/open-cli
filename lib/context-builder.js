/**
 * Context builder - decides what files to include in AI conversations
 */
class ContextBuilder {
    constructor(fileManager) {
      if (!fileManager) {
      throw new Error('FileManager is required for ContextBuilder');
      }

      this.fileManager = fileManager;
      this.maxContextLength = 8000; // Maximum characters to include in context
      this.currentContext = new Set(); // Currently included files
    }

    /**
   * Build context for a user message
   * @param {string} userMessage - The user's message
   * @param {Array} conversationHistory - Previous conversation
   * @returns {string} Context string to prepend to the conversation
   */
  buildContext(userMessage, conversationHistory = []) {
    // Find files mentioned in the current message
    const mentionedFiles = this._findMentionedFiles(userMessage)

    // Find files mentioned in recent conversation
    const recentlyMentioned = this._findRecentlyMentionedFiles(conversationHistory);

    // Combine and deduplicate
    const filesToInclude = new Set([...mentionedFiles, ...recentlyMentioned]);

    // Build context string
    let context = '';
    let currentLength = 0;

    if (filesToInclude.size > 0) {
        context += "=== PROJECT CONTEXT ===\n";
        context += "Here are the relevant files from the user's project:\n\n";

        for (const filePath of filesToInclude) {
            const fileContext = this._buildFileContext(filePath);

            // Check if adding this file would exceed context limit
            if (currentLength + fileContext.length > this.maxContextLength) {
            context += `... (More files available but context limit reached)\n\n`;
            break;
            }

            context += fileContext;
            currentLength += fileContext.length;
        }

        context += "=== END PROJECT CONTEXT ===\n\n";
    }

    // Update current context for future reference
    this.currentContext = filesToInclude;

    return context;
  }

  /**
   * Find files mentioned in a user message
   * @param {string} message - The user's message
   * @returns {Array} Array of file paths mentioned
   */
  _findMentionedFiles(message) {
    const mentionedFiles = [];
    const lowerMessage = message.toLowerCase();

    // Look for direct file mentions
    const filePatterns = [
      /(\w+\.\w+)/g,           // filename.ext
      /([\w/]+\.[\w]+)/g,      // path/to/file.ext
      /`([^`]+\.\w+)`/g,       // `filename.ext` (in backticks)
      /"([^"]+\.\w+)"/g,       // "filename.ext" (in quotes)
      /'([^']+\.\w+)'/g        // 'filename.ext' (in single quotes)
    ];

    for (const pattern of filePatterns) {
        const matches = message.match(pattern)
        if (matches) {
            for (const match of matches) {
                // Clean up the match (remove quotes/backticks)
                const cleanMatch = match.replace(/[`"']/g, '');

                // Find actual files that match this pattern
                const matchingFiles = this.fileManager.findFiles(cleanMatch);
                for (const file of matchingFiles) {
                    mentionedFiles.push(file.relativePath);
                }
            }
        }
    }

    // Look for general keywords that might indicate file types
    const keywordToFileType = {
        'main': ['main.js', 'main.py', 'index.js', 'app.js', 'main.cpp'],
        'config': ['.config', 'config.js', 'config.json', 'package.json'],
        'readme': ['README.md', 'readme.txt'],
        'test': ['test', 'spec', '__test__'],
        'component': ['.jsx', '.tsx', '.vue'],
        'style': ['.css', '.scss', '.sass'],
        'database': ['db', 'database', '.sql'],
        'api': ['api', 'routes', 'endpoints'],
        'auth': ['auth', 'login', 'authentication']
    };

    for (const [keyword, patterns] of Object.entries(keywordToFileType)) {
        if (lowerMessage.includes(keyword)) {
            for (const pattern of patterns) {
                const matchingFiles = this.fileManager.findFiles(pattern);
                for (const file of matchingFiles.slice(0, 3)) { // Limit to 3 matches per keyword
                    mentionedFiles.push(file.relativePath)
                }
            }
        }
    }

    return [...new Set(mentionedFiles)]; // Remove duplicates
  }

  /**
   * Find files mentioned in recent conversation history
   * @param {Array} conversationHistory - Array of conversation messages
   * @returns {Array} Array of file paths mentioned recently
   */
  _findRecentlyMentionedFiles(conversationHistory) {
    const recentFiles = new Set();

    // Look at last 4 messages for context continuity
    const recentMessages = conversationHistory.slice(-4);

    for (const message of recentMessages) {
        if (message.role === 'user') {
            const mentioned = this._findMentionedFiles(message.content);
            mentioned.forEach(file => recentFiles.add(file))
        }
    }

    return Array.from(recentFiles);
  }

  /**
   * Build context string for a specific file
   * @param {string} filePath - Path to the file
   * @returns {string} Formatted context for this file
   */
  _buildFileContext(filePath) {
    const content = this.fileManager.readFile(filePath);

    if (!content){
        return `FILE: ${filePath}\n[Error: Could not read file]\n\n`;
    }

    // Truncate very long files
    const truncatedContent = content.length > 2000
        ? content.substring(0, 2000) + '\n... [File truncated]\n'
        : content;
    
    return `FILE: ${filePath}\n${'='.repeat(40)}\n${truncatedContent}\n${'='.repeat(40)}\n\n`;
  }

  /**
   * Get a general project overview (for when no specific files mentioned)
   * @returns {string} Project overview context
   */
  getProjectOverview() {
    const summary = this.fileManager.getProjectSummary();
    return `=== PROJECT OVERVIEW ===\n${summary}\n=== END PROJECT OVERVIEW ===\n\n`;
  }

  /**
   * Force include specific files in context
   * @param {Array} filePaths - Array of file paths to include
   */
  includeFiles(filePaths) {
    for (const filePath of filePaths) {
      this.currentContext.add(filePath);
    }
  }

  /**
   * Clear current context
   */
  clearContext() {
    this.currentContext.clear();
  }

  /**
   * Get currently included files
   * @returns {Array} Array of currently included file paths
   */
  getCurrentContext() {
    return Array.from(this.currentContext);
  }
}

module.exports = ContextBuilder;