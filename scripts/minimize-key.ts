#!/usr/bin/env node
// To run - npx tsx scripts/minimize-key.ts or
//  npx tsx scripts/minimize-key.ts -i .\credentials\fogcitymarathoner-nextjs-cloud-deploy-e8e78593f04b.json -o .\credentials\fogcitymarathoner-nextjs-cloud-deploy-e8e78593f04b.min.json
import * as fs from 'fs';
import * as path from 'path';

// Define the structure of a GCP service account key
interface GCPKey {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url?: string;
  client_x509_cert_url?: string;
  universe_domain?: string;
}

// Fields that are absolutely essential for authentication
const REQUIRED_FIELDS: (keyof GCPKey)[] = [
  'type',
  'project_id',
  'private_key_id',
  'private_key',
  'client_email',
  'client_id',
  'token_uri'
];

// Optional fields that can be removed to minimize size
const OPTIONAL_FIELDS: (keyof GCPKey)[] = [
  'auth_uri',
  'auth_provider_x509_cert_url',
  'client_x509_cert_url',
  'universe_domain'
];

interface MinimizeOptions {
  input?: string;      // Input file path
  output?: string;     // Output file path
  pretty?: boolean;    // Keep pretty formatting (default: false - minify)
  removeNewlines?: boolean; // Remove newlines from private_key (default: false)
}

class GCPKeyMinimizer {
  /**
   * Minimize a GCP service account key JSON
   */
  static minimize(keyData: GCPKey, options: MinimizeOptions = {}): string {
    // Create minimized object with only required fields
    const minimized: Partial<GCPKey> = {};

    for (const field of REQUIRED_FIELDS) {
      if (keyData[field]) {
        minimized[field] = keyData[field];
      }
    }

    // Handle private_key formatting
    let privateKey = minimized.private_key;
    if (privateKey && options.removeNewlines) {
      // Remove newlines from private key (still valid PEM format)
      privateKey = privateKey.replace(/\n/g, '\\n');
      minimized.private_key = privateKey;
    }

    // Stringify with appropriate formatting
    if (options.pretty) {
      return JSON.stringify(minimized, null, 2);
    } else {
      // Minify - no extra whitespace
      return JSON.stringify(minimized);
    }
  }

  /**
   * Load key from file
   */
  static loadFromFile(filePath: string): GCPKey {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as GCPKey;
  }

  /**
   * Save minimized key to file
   */
  static saveToFile(content: string, filePath: string): void {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`✅ Minimized key saved to: ${filePath}`);
  }

  /**
   * Get size comparison
   */
  static getSizeComparison(original: GCPKey, minimized: string): void {
    const originalSize = JSON.stringify(original).length;
    const minimizedSize = minimized.length;
    const reduction = ((originalSize - minimizedSize) / originalSize * 100).toFixed(1);

    console.log('\n📊 Size Comparison:');
    console.log(`  Original:  ${(originalSize / 1024).toFixed(2)} KB`);
    console.log(`  Minimized: ${(minimizedSize / 1024).toFixed(2)} KB`);
    console.log(`  Reduced:   ${reduction}%`);
    console.log(`  Saved:     ${((originalSize - minimizedSize) / 1024).toFixed(2)} KB`);
  }
}

// CLI Interface
const main = async (): Promise<void> => {
  const args = process.argv.slice(2);

  // Parse command line arguments
  const options: MinimizeOptions = {
    pretty: args.includes('--pretty') || args.includes('-p'),
    removeNewlines: args.includes('--remove-newlines') || args.includes('-r')
  };

  let inputFile: string | undefined;
  let outputFile: string | undefined;

  // Parse file arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--input' || args[i] === '-i') {
      inputFile = args[++i];
    } else if (args[i] === '--output' || args[i] === '-o') {
      outputFile = args[++i];
    } else if (!args[i].startsWith('-')) {
      if (!inputFile) inputFile = args[i];
      else if (!outputFile) outputFile = args[i];
    }
  }

  // Show help
  if (args.includes('--help') || args.includes('-h') || !inputFile) {
    console.log(`
🔧 GCP Service Account Key Minimizer

Usage:
  npx ts-node src/minimize-key.ts [input] [output] [options]

Arguments:
  input                   Input JSON key file path
  output                  Output file path (optional)

Options:
  -i, --input <file>      Input JSON key file path
  -o, --output <file>     Output file path (default: input file with .min suffix)
  -p, --pretty            Keep pretty formatting (default: minified)
  -r, --remove-newlines   Remove newlines from private_key (may break some tools)
  -h, --help              Show this help message

Examples:
  # Basic minification
  npx ts-node src/minimize-key.ts service-key.json
  
  # Specify output file
  npx ts-node src/minimize-key.ts service-key.json minimized-key.json
  
  # Keep pretty formatting but remove optional fields
  npx ts-node src/minimize-key.ts service-key.json --pretty
  
  # Remove newlines from private key (for single-line env vars)
  npx ts-node src/minimize-key.ts service-key.json --remove-newlines
`);
    process.exit(0);
  }

  try {
    // Validate input file exists
    if (!fs.existsSync(inputFile)) {
      console.error(`❌ Error: Input file not found: ${inputFile}`);
      process.exit(1);
    }

    // Load original key
    console.log(`📂 Loading key from: ${inputFile}`);
    const originalKey = GCPKeyMinimizer.loadFromFile(inputFile);

    // Minimize
    console.log('🔧 Minimizing key...');
    const minimizedJson = GCPKeyMinimizer.minimize(originalKey, options);

    // Determine output path
    if (!outputFile) {
      const parsedPath = path.parse(inputFile);
      outputFile = path.join(parsedPath.dir, `${parsedPath.name}.min${parsedPath.ext}`);
    }

    // Save minimized key
    GCPKeyMinimizer.saveToFile(minimizedJson, outputFile);

    // Show size comparison
    GCPKeyMinimizer.getSizeComparison(originalKey, minimizedJson);

    // Show which fields were removed
    const removedFields = OPTIONAL_FIELDS.filter(field => originalKey[field]);
    if (removedFields.length > 0) {
      console.log('\n🗑️  Removed optional fields:', removedFields.join(', '));
    }

    console.log('\n✨ Done! You can now use the minimized key in your CI/CD pipeline.');

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  main();
}

export { GCPKeyMinimizer, type GCPKey, type MinimizeOptions };