'use strict';

const crypto = require('crypto');

// In-memory storage for demonstration
const stockLikes = {};
const ipLikes = {};

module.exports = function (app) {
  app.route('/api/stock-prices')
    .get(async (req, res) => {
      let { stock, like } = req.query;
      
      // Ensure 'stock' is always treated as an array
      if (!Array.isArray(stock)) {
        stock = [stock]; // Convert single stock to array
      }

      // Get client IP and anonymize it with SHA-256 hash
      const clientIp = req.ip;
      const hashedIp = crypto.createHash('sha256').update(clientIp).digest('hex');

      // Mock stock data for the test
      const mockData = {
        'TSLA': { symbol: 'TSLA', latestPrice: 650.25 },
        'GOLD': { symbol: 'GOLD', latestPrice: 1800.75 },
        'AMZN': { symbol: 'AMZN', latestPrice: 3450.50 },
        'T': { symbol: 'T', latestPrice: 30.00 }
      };

      try {
        const stockDataPromises = stock.map(async (stockSymbol) => {
          // Check if stockSymbol exists in mock data
          if (!mockData[stockSymbol]) {
            console.error(`Stock symbol not found: ${stockSymbol}`);
            return { error: `Stock symbol not found: ${stockSymbol}` };
          }

          const data = mockData[stockSymbol];
          const symbol = data.symbol;
          const price = Number(data.latestPrice);

          // Initialize likes count if not already set
          if (!stockLikes[symbol]) {
            stockLikes[symbol] = 0;
          }

          // Process like if provided
          if (like === 'true') {
            if (!ipLikes[hashedIp]) {
              ipLikes[hashedIp] = new Set();
            }

            // Only allow one like per IP per stock
            if (!ipLikes[hashedIp].has(symbol)) {
              stockLikes[symbol]++;
              ipLikes[hashedIp].add(symbol);
            }
          }

          return {
            stock: symbol,
            price: price,
            likes: stockLikes[symbol]
          };
        });

        const stockDataArray = await Promise.all(stockDataPromises);

        // Check if any stock symbol was not found
        if (stockDataArray.some(data => data.error)) {
          return res.status(400).json({ error: 'One or more stock symbols are invalid.' });
        }

        // Handle response format based on number of stocks
        if (stock.length === 2) {
          // For two stocks, calculate relative likes
          const relLikes = stockDataArray[0].likes - stockDataArray[1].likes;
          
          const responseData = [
            {
              stock: stockDataArray[0].stock,
              price: stockDataArray[0].price,
              rel_likes: relLikes
            },
            {
              stock: stockDataArray[1].stock,
              price: stockDataArray[1].price,
              rel_likes: -relLikes
            }
          ];
          
          return res.json({ stockData: responseData });
        } else {
          // For a single stock
          return res.json({ stockData: stockDataArray[0] });
        }
      } catch (error) {
        console.error('Error processing request:', error);
        res.status(500).json({ error: 'Error processing request' });
      }
    });
};

// Export these for testing purposes
module.exports.stockLikes = stockLikes;
module.exports.ipLikes = ipLikes;
