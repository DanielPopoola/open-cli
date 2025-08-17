const fs = require('fs');
const path = require('path');

/**
 * File manager for project context awareness
 */
class FileManager {
    constructor(projectPath = process.cwd()) {
        this.projectPath = projectPath;
        this.supportedExtensions = new Set([
            '.js', '.jsx', '.ts', '.tsx',     // JavaScript/TypeScript
            '.py', '.pyx',                    // Python
            '.java', '.kt',                   // Java/Kotlin
            '.cpp', '.c', '.h', '.hpp',       // C/C++
            '.rs',                            // Rust
            '.go',                            // Go
            '.php',                           // PHP
            '.rb',                            // Ruby
            '.swift',                         // Swift
            '.dart',                          // Dart
            '.sh', '.bash',                   // Shell scripts
            '.sql',                           // SQL
            '.json', '.yaml', '.yml',         // Config files
            '.md', '.txt',                    // Documentation
            '.html', '.css', '.scss'          // Web files
        ]);

        // Directories to ignore when scanning
        this.ignoredDirs = new Set([
            'node_modules', '.git', '.vscode', '.idea',
            '__pycache__', '.pytest_cache', '.mypy_cache',
            'build', 'dist', 'target', '.next', '.nuxt',
            'coverage', '.coverage', '.nyc_output',
            'vendor', 'Pods', '.gradle'
        ]);

        // Files to ignore
        this.ignoredFiles = new Set([
        '.DS_Store', '.gitignore', '.npmignore',
        '.env', '.env.local', '.env.production',
        'package-lock.json', 'yarn.lock',
        '.eslintrc', '.prettierrc'
        ]);

        this.projectFiles = [];
    }

    /**
   * Scan the project directory for relevant files
   * @returns {Array} Array of file objects with path, name, and extension
   */
  scanProject() {
    console.log(`🔍 Scanning project at: ${this.projectPath}`);
    this.projectFiles = [];
    this._scanDirectory(this.projectPath);

    console.log(`📁 Found ${this.projectFiles.length} relevant files`);
    return this.projectFiles;
  }

  /**
   * Recursively scan a directory
   * @param {string} dirPath - Directory path to scan
   * @param {number} depth - Current recursion depth (to prevent too deep scanning)
   */
  _scanDirectory(dirPath, depth = 0) {
    // Prevent scanning too deep (performance)
    if (depth > 5) return;

    try {
        const items = fs.readdirSync(dirPath);

        for (const item of items) {
            const fullPath = path.join(dirPath, item);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
                // Skip ignored directories
                if (!this.ignoredDirs.has(item)) {
                    this._scanDirectory(fullPath, depth + 1);
                }
            } else if (stat.isFile()) {
                // Check if file should be included
                if (this._shouldIncludeFile(item, fullPath)) {
                    this.projectFiles.push({
                        name: item,
                        path: fullPath,
                        relativePath: path.relative(this.projectPath, fullPath),
                        extension: path.extname(item),
                        size: stat.size
                    });
                }
            }
        }
    } catch (error) {
    // Skip directories we can't read (permissions, etc.)
    console.warn(`⚠️  Couldn't scan ${dirPath}: ${error.message}`);
  }
  }

  /**
   * Check if a file should be included in the project scan
   * @param {string} filename - The filename
   * @param {string} fullPath - Full path to the file
   * @returns {boolean} True if file should be included
   */
  _shouldIncludeFile(filename, fullPath) {
    // Skip ignored files
    if (this.ignoredFiles.has(filename)) {
        return false;
    }

    // Check file extension
    const ext = path.extname(filename)
    if (!this.supportedExtensions.has(ext)) {
        return false;
    }

    // Skip very large files (over 1MB)
    const stat = fs.statSync(fullPath);
    if (stat.size > 1024 * 1024) {
      return false;
    }

    return true;
  }

  /**
   * Read the contents of a file
   * @param {string} filePath - Path to the file (relative or absolute)
   * @returns {string|null} File contents or null if error
   */
  readFile(filePath) {
    try {
        let fullPath;

        // Handle both relative and absolute paths
        if (path.isAbsolute(filePath)) {
            fullPath = filePath;
        } else {
            fullPath = path.join(this.projectPath, filePath);
        }

        // Check if file exists
        if (!fs.existsSync(filePath)) {
            return null;
        }

        const content = fs.readFileSync(fullPath, 'utf-8');
        return content;
    } catch (error) {
        console.error(`❌ Error reading file ${filePath}:`, error.message);
        return null;
    }
  }

  /**
   * Find files by name or pattern
   * @param {string} query - Search query (filename or pattern)
   * @returns {Array} Matching files
   */
  findFiles(query) {
    const matches = [];
    const lowerQuery = query.toLowerCase();

    for (const file of this.projectFiles) {
        // Check if filename contains the query
        if (file.name.toLowerCase().includes(lowerQuery)) {
            matches.push(file);
        }
        // Also check relative path for partial matches
        else if (file.relativePath.toLowerCase().includes(lowerQuery)) {
            matches.push(file);
        }
    }

    return matches;
  }

  /**
   * Get project summary for AI context
   * @returns {string} A summary of the project structure
   */
  getProjectSummary() {
    if (this.projectFiles.length === 0) {
        this.scanProject();
    }

    // Group files by extension
    const filesByType = {};
    for (const file of this.projectFiles) {
        const ext = file.extension || 'no-extension';
        if (!filesByType[ext]) {
            filesByType[ext] = [];
        }
        filesByType[ext].push(file.relativePath);
    }

    // Build summary
    let summary = `Project Summary (${this.projectFiles.length} files):\n`;

    for (const [ext, files] of Object.entries(filesByType)) {
        summary += `\n${ext} files (${files.length}):\n`;
        // Limit to first 10 files per type to avoid overwhelming the AI
        const displayFiles = files.slice(0, 10);
        for (const file of displayFiles) {
            summary += `  - ${file}\n`;
        }
        if (files.length > 10) {
            summary += `  ... and ${files.length - 10} more\n`;
        }
    }

    return summary;
  }

  /**
   * Get all project files
   * @returns {Array} All scanned project files
   */
  getProjectFiles() {
    return this.projectFiles;
  }
}

module.exports = FileManager;