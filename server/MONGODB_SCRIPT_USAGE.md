# MongoDB Management Script

This script provides a command-line interface to manage your MongoDB database, including viewing tables (collections), creating/dropping databases, and more.

## Usage

All commands should be run from the `server` directory:

```bash
cd server
npm run mongo <action> [options]
```

## Available Actions

### 1. Connect to MongoDB
```bash
npm run mongo connect
npm run mongo connect --uri mongodb://admin:admin123@localhost:27017
```

### 2. List All Databases
```bash
npm run mongo list-databases
```

### 3. List Collections (Tables) in a Database
```bash
npm run mongo list-collections --database teamconnect
npm run mongo list-collections -d teamconnect
```

### 4. Create a New Database
```bash
npm run mongo create-database --database mynewdb
npm run mongo create-database -d mynewdb
```

### 5. Drop a Database
```bash
npm run mongo drop-database --database myolddb
npm run mongo drop-database -d myolddb
```

### 6. Show Collection Statistics
```bash
npm run mongo show-stats --database teamconnect --collection users
npm run mongo show-stats -d teamconnect -c users
```

### 7. Count Documents in a Collection
```bash
npm run mongo count-documents --database teamconnect --collection users
npm run mongo count-documents -d teamconnect -c users
```

## Environment Variables

The script uses the following environment variables (from `.env` file or environment):

- `MONGODB_URI` - MongoDB connection string (default: `mongodb://localhost:27017/teamconnect`)
- `MONGO_USERNAME` or `MONGO_INITDB_ROOT_USERNAME` - MongoDB username (for Docker setup)
- `MONGO_PASSWORD` or `MONGO_INITDB_ROOT_PASSWORD` - MongoDB password (for Docker setup)

## Docker Setup

If using Docker Compose with authentication, you can override the URI:

```bash
npm run mongo connect --uri mongodb://admin:admin123@localhost:27017
npm run mongo list-databases --uri mongodb://admin:admin123@localhost:27017
```

## Examples

```bash
# List all databases
npm run mongo list-databases

# View all collections in teamconnect database
npm run mongo list-collections -d teamconnect

# View stats for users collection
npm run mongo show-stats -d teamconnect -c users

# Count documents in users collection
npm run mongo count-documents -d teamconnect -c users

# Create a new test database
npm run mongo create-database -d testdb

# Drop a database
npm run mongo drop-database -d testdb
```

## Help

To see all available options:

```bash
npm run mongo
```

This will display the usage information and all available commands.

