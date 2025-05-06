'use strict';

const crypto = require('crypto');

const stockLikes = {};
const ipLikes = {};

module.exports = function (app) {
  app.route('/api/stock-prices')
    .get(async (req, res) => {
      let { stock, like } = req.query;
      
      const clientIp = req.ip;
      const hashedIp = crypto.createHash('sha256').update(clientIp).digest('hex');

      if (!Array.isArray(stock)) {
        stock = [stock];
      }

      try {
        const stockDataPromises = stock.map(async (stockSymbol) => {
          const mockData = {
            'TSLA': { symbol: 'TSLA', latestPrice: 650.25 },
            'GOLD': { symbol: 'GOLD', latestPrice: 1800.75 },
            'AMZN': { symbol: 'AMZN', latestPrice: 3450.50 },
            'T': { symbol: 'T', latestPrice: 30.00 }
          };

          if (!mockData[stockSymbol]) {
            throw new Error(`Mock data not found for stock symbol: ${stockSymbol}`);
          }

          const data = mockData[stockSymbol];
          const symbol = data.symbol;
          const price = Number(data.latestPrice);

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
            likes: stockLikes[symbol]
          };
        });

        const stockDataArray = await Promise.all(stockDataPromises);

        if (stock.length === 2) {
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
          return res.json({ stockData: stockDataArray[0] });
        }
      } catch (error) {
        console.error('Error processing request:', error);
        res.status(500).json({ error: 'Error processing request' });
      }
    });
};

module.exports.stockLikes = stockLikes;
module.exports.ipLikes = ipLikes;
