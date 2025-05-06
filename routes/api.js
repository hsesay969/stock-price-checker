'use strict';

const fetch = require('node-fetch');
const crypto = require('crypto');

const stockLikes = {};
const ipLikes = {};

module.exports = function (app) {
  app.route('/api/stock-prices')
    .get(async (req, res) => {
      let { stock, like } = req.query;
      const clientIp = req.ip;
      const hashedIp = crypto.createHash('sha256').update(clientIp).digest('hex');

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
            // Mock response
            const mockData = {
              symbol: stockSymbol,
              latestPrice: 100.00 + Math.random() * 100,
            };
            console.log(`Mocking data for ${stockSymbol}:`, mockData);
            const data = mockData;

            // Uncomment this when the proxy API is back
            // const response = await fetch(
            //   `https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/${stockSymbol}/quote`
            // );
            // if (!response.ok) {
            //   console.error(`Fetch failed for ${stockSymbol}: ${response.status} ${response.statusText}`);
            //   throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
            // }
            // const data = await response.json();
            // console.log(`Proxy API response for ${stockSymbol}:`, data);

            if (!data.symbol || data.latestPrice == null) {
              return { error: `Invalid stock symbol: ${stockSymbol}` };
            }

            const symbol = data.symbol.toUpperCase();
            const price = Number(data.latestPrice);

            if (isNaN(price)) {
              return { error: `Invalid price data for ${stockSymbol}` };
            }

            if (!stockLikes[symbol]) {
              stockLikes[symbol] = 0;
            }

            if (like === 'true') {
              if (!ipLikes[hashedIp]) {
                ipLikes[hashedIp] = new Set();
              }

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
            return { error: `Error fetching stock data for ${stockSymbol}: ${error.message}` };
          }
        });

        const stockDataArray = await Promise.all(stockDataPromises);

        const hasErrors = stockDataArray.some((data) => data.error);
        if (hasErrors) {
          return res.status(400).json({
            stockData: stockDataArray.map((data) =>
              data.error ? { error: data.error } : data
            ),
          });
        }

        if (stockDataArray.length === 2) {
          const relLikes = stockDataArray[0].likes - stockDataArray[1].likes;
          stockDataArray[0].rel_likes = relLikes;
          stockDataArray[1].rel_likes = relLikes;
          delete stockDataArray[0].likes;
          delete stockDataArray[1].likes;
          res.json({ stockData: stockDataArray });
        } else {
          res.json({ stockData: stockDataArray[0] });
        }
      } catch (error) {
        console.error('Error processing request:', error);
        res.status(500).json({ error: error.message || 'Error processing request' });
      }
    });
};

module.exports.stockLikes = stockLikes;
module.exports.ipLikes = ipLikes;