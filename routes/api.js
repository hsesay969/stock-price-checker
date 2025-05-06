'use strict';

const fetch = require('node-fetch');
const crypto = require('crypto');

// In-memory storage for demonstration
const stockLikes = {};
const ipLikes = {};

module.exports = function (app) {
  app.route('/api/stock-prices')
    .get(async (req, res) => {
      let { stock, like } = req.query;
      
      // Get client IP and anonymize it with SHA-256 hash
      const clientIp = req.ip;
      const hashedIp = crypto.createHash('sha256').update(clientIp).digest('hex');

      // Handle single stock or multiple stocks
      if (!Array.isArray(stock)) {
        stock = [stock]; // Convert to array for consistent handling
      }

      try {
        const stockDataPromises = stock.map(async (stockSymbol) => {
          try {
            // Fetch stock data from the proxy API
            const response = await fetch(
              `https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/${stockSymbol}/quote`
            );
            
            if (!response.ok) {
              throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (!data || !data.symbol) {
              throw new Error(`Invalid stock symbol: ${stockSymbol}`);
            }

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
          } catch (error) {
            console.error(`Error fetching stock data for ${stockSymbol}:`, error);
            throw error;
          }
        });

        const stockDataArray = await Promise.all(stockDataPromises);

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