'use strict';

const fetch = require('node-fetch');
const crypto = require('crypto');

// In-memory storage for demonstration 
// In production, this would be replaced with database storage
const stockLikes = {};
const ipLikes = {};

module.exports = function (app) {
  app.route('/api/stock-prices')
    .get(async (req, res) => {
      let { stock, like } = req.query;
      
      // Get client IP and anonymize it with SHA-256 hash
      const clientIp = req.ip;
      const hashedIp = crypto.createHash('sha256').update(clientIp).digest('hex');

      // Ensure stock is always an array for consistent processing
      if (typeof stock === 'string') {
        stock = [stock];
      } else if (!Array.isArray(stock)) {
        stock = [];
      }

      if (stock.length === 0) {
        return res.status(400).json({ error: 'No stock symbols provided' });
      }

      try {
        const stockDataPromises = stock.map(async (stockSymbol) => {
          try {
            // Ensure stockSymbol is trimmed and uppercase
            stockSymbol = stockSymbol.trim().toUpperCase();
            
            // Fetch stock data from the proxy API
            const response = await fetch(
              `https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/${stockSymbol}/quote`
            );
            
            if (!response.ok) {
              throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (!data.symbol || data.latestPrice == null) {
              return { error: `Invalid stock symbol: ${stockSymbol}` };
            }

            const symbol = data.symbol.toUpperCase();
            const price = Number(data.latestPrice);

            if (isNaN(price)) {
              return { error: `Invalid price data for ${stockSymbol}` };
            }

            // Initialize likes count if not already set
            if (!stockLikes[symbol]) {
              stockLikes[symbol] = 0;
            }

            // Process like request if provided
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
              likes: Number(stockLikes[symbol]),
            };
          } catch (error) {
            console.error(`Error fetching stock data for ${stockSymbol}:`, error);
            // Return error object but don't throw
            return { error: `Error fetching stock data for ${stockSymbol}: ${error.message}` };
          }
        });

        const stockDataArray = await Promise.all(stockDataPromises);

        // Filter out any stock data with errors
        const validStockData = stockDataArray.filter(data => !data.error);
        
        if (validStockData.length === 0) {
          // No valid stock data at all
          return res.status(400).json({
            error: 'No valid stock data available',
            details: stockDataArray.map(data => data.error || data)
          });
        }

        // Handle different response formats based on number of valid stocks
        if (validStockData.length === 2) {
          // For two stocks, calculate relative likes
          const relLikes = validStockData[0].likes - validStockData[1].likes;
          validStockData[0].rel_likes = relLikes;
          validStockData[1].rel_likes = -relLikes;
          delete validStockData[0].likes;
          delete validStockData[1].likes;
          res.json({ stockData: validStockData });
        } else {
          // For a single stock, return just that stock data
          res.json({ stockData: validStockData[0] });
        }
      } catch (error) {
        console.error('Error processing request:', error);
        res.status(500).json({ error: error.message || 'Error processing request' });
      }
    });
};

// Export these for testing purposes
module.exports.stockLikes = stockLikes;
module.exports.ipLikes = ipLikes;