import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { MongoClient, Db } from 'mongodb';

dotenv.config();

interface MongoDBManagerOptions {
  action: 'list-databases' | 'list-collections' | 'create-database' | 'drop-database' | 'show-stats' | 'count-documents' | 'connect';
  database?: string;
  collection?: string;
  uri?: string;
}

class MongoDBManager {
  private client: MongoClient | null = null;
  private mongooseConnection: typeof mongoose | null = null;

  /**
   * Get MongoDB connection URI
   */
  private getConnectionUri(): string {
    let uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/teamconnect';
    
    // If URI doesn't include authentication but docker-compose has credentials
    if (!uri.includes('@')) {
      const username = process.env.MONGO_USERNAME || process.env.MONGO_INITDB_ROOT_USERNAME;
      const password = process.env.MONGO_PASSWORD || process.env.MONGO_INITDB_ROOT_PASSWORD;
      
      if (username && password) {
        try {
          const url = new URL(uri);
          url.username = username;
          url.password = password;
          uri = url.toString();
        } catch (error) {
          // If URL parsing fails, construct it manually
          const protocol = uri.startsWith('mongodb+srv://') ? 'mongodb+srv://' : 'mongodb://';
          const rest = uri.replace(/^mongodb(\+srv)?:\/\//, '');
          const parts = rest.split('/');
          const host = parts[0];
          const db = parts[1] || '';
          
          if (protocol === 'mongodb+srv://') {
            uri = `mongodb+srv://${username}:${password}@${host}${db ? '/' + db : ''}`;
          } else {
            uri = `mongodb://${username}:${password}@${host}${db ? '/' + db : ''}`;
          }
        }
      }
    }
    
    return uri;
  }

  /**
   * Connect to MongoDB using native driver
   */
  async connect(uri?: string): Promise<void> {
    let connectionUri = uri || this.getConnectionUri();
    
    try {
      // Extract base URI (without database name) for native client
      // Handle both standard mongodb:// and mongodb+srv:// URIs
      // Pattern: mongodb://[user:pass@]host[:port][/db] or mongodb+srv://[user:pass@]host[/db]
      // Simple regex extraction - remove database name if present
      const match = connectionUri.match(/^(mongodb(\+srv)?:\/\/[^\/]+)/);
      const baseUri = match ? match[1] : connectionUri.replace(/\/[^\/]+$/, '');
      
      this.client = new MongoClient(baseUri);
      await this.client.connect();
      console.log('✅ Connected to MongoDB');
      const maskedUri = baseUri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
      console.log(`   URI: ${maskedUri}`);
    } catch (error) {
      console.error('❌ MongoDB connection error:', error);
      throw error;
    }
  }

  /**
   * Connect to MongoDB using Mongoose
   */
  async connectWithMongoose(uri?: string): Promise<void> {
    const connectionUri = uri || this.getConnectionUri();
    
    try {
      await mongoose.connect(connectionUri);
      console.log('✅ Connected to MongoDB via Mongoose');
      this.mongooseConnection = mongoose;
    } catch (error) {
      console.error('❌ MongoDB connection error:', error);
      throw error;
    }
  }

  /**
   * List all databases
   */
  async listDatabases(): Promise<void> {
    if (!this.client) {
      await this.connect();
    }

    try {
      const adminDb = this.client!.db().admin();
      const { databases } = await adminDb.listDatabases();
      
      console.log('\n📊 Available Databases:');
      console.log('='.repeat(60));
      
      databases.forEach((db, index) => {
        const sizeOnDisk = typeof db.sizeOnDisk === 'number' ? db.sizeOnDisk : 0;
        const sizeInMB = (sizeOnDisk / 1024 / 1024).toFixed(2);
        console.log(`${index + 1}. ${db.name}`);
        console.log(`   Size: ${sizeOnDisk === 0 ? 'N/A' : sizeInMB + ' MB'}`);
        console.log('');
      });
      
      console.log(`Total: ${databases.length} database(s)`);
    } catch (error) {
      console.error('❌ Error listing databases:', error);
      throw error;
    }
  }

  /**
   * List all collections in a database
   */
  async listCollections(databaseName: string): Promise<void> {
    if (!this.client) {
      await this.connect();
    }

    try {
      const db = this.client!.db(databaseName);
      const collections = await db.listCollections().toArray();
      
      console.log(`\n📁 Collections in database "${databaseName}":`);
      console.log('='.repeat(60));
      
      if (collections.length === 0) {
        console.log('No collections found.');
      } else {
        for (const collection of collections) {
          const count = await db.collection(collection.name).countDocuments();
          
          console.log(`\n${collection.name}:`);
          console.log(`  Documents: ${count}`);
          
          // Try to get stats (may not be available in all MongoDB versions)
          try {
            const stats = await db.command({ collStats: collection.name });
            const sizeInKB = stats ? ((stats.size || 0) / 1024).toFixed(2) : 'N/A';
            const storageSizeInKB = stats ? ((stats.storageSize || 0) / 1024).toFixed(2) : 'N/A';
            console.log(`  Size: ${sizeInKB} KB`);
            console.log(`  Storage Size: ${storageSizeInKB} KB`);
          } catch (statsError) {
            // Stats not available, skip
          }
        }
        
        console.log(`\nTotal: ${collections.length} collection(s)`);
      }
    } catch (error) {
      console.error(`❌ Error listing collections in database "${databaseName}":`, error);
      throw error;
    }
  }

  /**
   * Create a new database
   */
  async createDatabase(databaseName: string): Promise<void> {
    if (!this.client) {
      await this.connect();
    }

    try {
      const db = this.client!.db(databaseName);
      // Create a collection to actually create the database
      // MongoDB creates databases lazily when first collection is created
      await db.createCollection('_init');
      await db.collection('_init').insertOne({ created: new Date() });
      
      console.log(`✅ Database "${databaseName}" created successfully`);
      
      // Optionally drop the init collection
      await db.collection('_init').drop();
    } catch (error) {
      console.error(`❌ Error creating database "${databaseName}":`, error);
      throw error;
    }
  }

  /**
   * Drop a database
   */
  async dropDatabase(databaseName: string): Promise<void> {
    if (!this.client) {
      await this.connect();
    }

    try {
      const db = this.client!.db(databaseName);
      const result = await db.dropDatabase();
      
      if (result) {
        console.log(`✅ Database "${databaseName}" dropped successfully`);
      } else {
        console.log(`⚠️  Database "${databaseName}" does not exist or could not be dropped`);
      }
    } catch (error) {
      console.error(`❌ Error dropping database "${databaseName}":`, error);
      throw error;
    }
  }

  /**
   * Show detailed statistics for a collection
   */
  async showCollectionStats(databaseName: string, collectionName: string): Promise<void> {
    if (!this.client) {
      await this.connect();
    }

    try {
      const db = this.client!.db(databaseName);
      const collection = db.collection(collectionName);
      
      const count = await collection.countDocuments();
      
      console.log(`\n📊 Statistics for collection "${collectionName}" in database "${databaseName}":`);
      console.log('='.repeat(60));
      console.log(`Collection Name: ${collectionName}`);
      console.log(`Document Count: ${count}`);
      
      // Try to get stats using collStats command
      try {
        const stats = await db.command({ collStats: collectionName });
        console.log(`Size: ${stats.size ? (stats.size / 1024).toFixed(2) : 'N/A'} KB`);
        console.log(`Storage Size: ${stats.storageSize ? (stats.storageSize / 1024).toFixed(2) : 'N/A'} KB`);
        console.log(`Average Document Size: ${stats.avgObjSize ? stats.avgObjSize.toFixed(2) : 'N/A'} bytes`);
        console.log(`Indexes: ${stats.nindexes || 0}`);
        console.log(`Total Index Size: ${stats.totalIndexSize ? (stats.totalIndexSize / 1024).toFixed(2) : 'N/A'} KB`);
      } catch (statsError) {
        console.log('Note: Detailed stats not available');
      }
      
      // Show indexes
      const indexes = await collection.indexes();
      if (indexes.length > 0) {
        console.log('\nIndexes:');
        indexes.forEach((index, i) => {
          console.log(`  ${i + 1}. ${index.name}:`, index.key);
        });
      }
      
      // Show sample documents (first 3)
      if (count > 0) {
        const sampleDocs = await collection.find().limit(3).toArray();
        console.log('\nSample Documents (first 3):');
        sampleDocs.forEach((doc, i) => {
          console.log(`  Document ${i + 1}:`, JSON.stringify(doc, null, 2));
        });
      }
    } catch (error) {
      console.error(`❌ Error getting stats for collection "${collectionName}":`, error);
      throw error;
    }
  }

  /**
   * Count documents in a collection
   */
  async countDocuments(databaseName: string, collectionName: string): Promise<void> {
    if (!this.client) {
      await this.connect();
    }

    try {
      const db = this.client!.db(databaseName);
      const count = await db.collection(collectionName).countDocuments();
      
      console.log(`\n📊 Document count in "${databaseName}.${collectionName}": ${count}`);
    } catch (error) {
      console.error(`❌ Error counting documents:`, error);
      throw error;
    }
  }

  /**
   * Close connections
   */
  async close(): Promise<void> {
    if (this.client) {
      await this.client.close();
      console.log('✅ MongoDB connection closed');
    }
    if (this.mongooseConnection) {
      await this.mongooseConnection.connection.close();
      console.log('✅ Mongoose connection closed');
    }
  }

  /**
   * Execute action based on options
   */
  async execute(options: MongoDBManagerOptions): Promise<void> {
    try {
      switch (options.action) {
        case 'connect':
          await this.connect(options.uri);
          console.log('Connection established. Use other commands to interact with the database.');
          break;
          
        case 'list-databases':
          await this.listDatabases();
          break;
          
        case 'list-collections':
          if (!options.database) {
            throw new Error('Database name is required for list-collections action');
          }
          await this.listCollections(options.database);
          break;
          
        case 'create-database':
          if (!options.database) {
            throw new Error('Database name is required for create-database action');
          }
          await this.createDatabase(options.database);
          break;
          
        case 'drop-database':
          if (!options.database) {
            throw new Error('Database name is required for drop-database action');
          }
          await this.dropDatabase(options.database);
          break;
          
        case 'show-stats':
          if (!options.database || !options.collection) {
            throw new Error('Database and collection names are required for show-stats action');
          }
          await this.showCollectionStats(options.database, options.collection);
          break;
          
        case 'count-documents':
          if (!options.database || !options.collection) {
            throw new Error('Database and collection names are required for count-documents action');
          }
          await this.countDocuments(options.database, options.collection);
          break;
          
        default:
          throw new Error(`Unknown action: ${options.action}`);
      }
    } finally {
      // Only close if it's not a connect-only action
      if (options.action !== 'connect') {
        await this.close();
      }
    }
  }
}

// CLI Interface
function parseArguments(): MongoDBManagerOptions {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    printUsage();
    process.exit(1);
  }

  const options: MongoDBManagerOptions = {
    action: args[0] as any,
  };

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--database' || arg === '-d') {
      options.database = args[++i];
    } else if (arg === '--collection' || arg === '-c') {
      options.collection = args[++i];
    } else if (arg === '--uri' || arg === '-u') {
      options.uri = args[++i];
    }
  }

  return options;
}

function printUsage(): void {
  console.log(`
📋 MongoDB Manager Script
Usage: npm run mongo <action> [options]

Actions:
  connect                    - Connect to MongoDB
  list-databases             - List all databases
  list-collections           - List all collections in a database (requires --database)
  create-database            - Create a new database (requires --database)
  drop-database              - Drop a database (requires --database)
  show-stats                 - Show detailed stats for a collection (requires --database and --collection)
  count-documents            - Count documents in a collection (requires --database and --collection)

Options:
  --database, -d <name>      - Database name
  --collection, -c <name>    - Collection name
  --uri, -u <uri>           - MongoDB connection URI (overrides MONGODB_URI env var)

Examples:
  npm run mongo connect
  npm run mongo list-databases
  npm run mongo list-collections --database teamconnect
  npm run mongo create-database --database mydb
  npm run mongo drop-database --database mydb
  npm run mongo show-stats --database teamconnect --collection users
  npm run mongo count-documents --database teamconnect --collection users
  npm run mongo connect --uri mongodb://admin:admin123@localhost:27017
`);
}

// Main execution
async function main() {
  try {
    const options = parseArguments();
    const manager = new MongoDBManager();
    await manager.execute(options);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export default MongoDBManager;

