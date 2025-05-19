# Ticket Analytics System

A modern web application for analyzing and managing ticket data with powerful analytics capabilities.

## Features

- **Comprehensive Analytics Dashboard**
  - Ticket resolution time tracking
  - Customer satisfaction metrics
  - Issue type distribution analysis
  - Agent performance monitoring
  - Trend analysis and reporting

- **Data Visualization**
  - Interactive charts and graphs
  - Customizable time periods
  - Multiple chart types (bar, line, pie)
  - Real-time data updates

- **Advanced Analytics**
  - Natural language query support
  - AI-powered insights generation
  - Custom metric calculations
  - Trend analysis and forecasting

## Tech Stack

- Next.js
- Prisma
- TypeScript
- Tailwind CSS
- Chart.js

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone [repository-url]
cd [project-directory]
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Set up environment variables:
```bash
cp .env.example .env
```
Edit `.env` with your database credentials and other configuration.

4. Initialize the database:
```bash
npx prisma migrate dev
```

5. Start the development server:
```bash
npm run dev
# or
yarn dev
```

The application will be available at `http://localhost:3000`

## Usage

1. **Data Import**
   - Import your ticket data through the dashboard
   - Supported formats: CSV, JSON
   - Automatic data validation and cleaning

2. **Analytics Dashboard**
   - View key metrics and KPIs
   - Customize time periods
   - Export reports and visualizations

3. **Natural Language Queries**
   - Ask questions about your data in plain English
   - Get instant insights and visualizations
   - Save and share custom queries

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please open an issue in the GitHub repository or contact the development team.
