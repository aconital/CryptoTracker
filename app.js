var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var CronJob = require('cron').CronJob;
var axios = require('axios');
var chalk = require('chalk');
var index = require('./routes/index');
var R = require('ramda');
require('console.table');
var readline = require('readline');
var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', index);


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

const remaining_ETH = 5.24504826+1.73064000;

const my_investment = require('./investment');

function generate_coin_data(data,my_investment) 
{
  let table = [];
  var total = {
    initial_buy:0,
    profit:0,
    precentage_change:0,
    all:0

  };
  for (var key in my_investment) 
  {
   if(!my_investment[key].initial_buying) continue;

    const symbol = key+my_investment[key].currency;
    //filter it from all data
    const coin = R.propEq('symbol', symbol);
    const coin_data = R.filter(coin, data); 
    const coin_price =coin_data[0].price;

    const cashout_price = coin_price * my_investment[key].balance * 0.99;
    const profit = cashout_price -  my_investment[key].initial_buying;
    const precentage_change = ((cashout_price - my_investment[key].initial_buying) / my_investment[key].initial_buying) *100;
    const table_row =
    {
      'Coin' : key,
      'Initial Buy': my_investment[key].initial_buying,
      'Profit': profit < 0 ? chalk.red("↓"+my_investment[key].currency+" "+Math.round(Math.abs(profit) * 1000000) / 1000000)
                           : chalk.green("↑"+my_investment[key].currency+" "+Math.round(Math.abs(profit) * 1000000) / 1000000),
      '%': precentage_change < 0 ? chalk.red("↓% "+Math.round(Math.abs(precentage_change) * 100) / 100)
                           : chalk.green("↑% "+Math.round(Math.abs(precentage_change) * 100) / 100),
      'Total ETH': cashout_price
    };
    total.all += cashout_price;
    total.initial_buy += my_investment[key].initial_buying;
    total.precentage_change += precentage_change;
    total.profit += profit
    
    table.push(table_row);
  }

  table.push({'Coin' :'',
      'Initial Buy':'-------------------',
      'Profit':'-------------------',
      '%':'-------------------',
      'Total ETH': '-------------------'
    });

  const total_amount = {
      'Coin' :'',
      'Initial Buy':chalk.yellow(total.initial_buy),
      'Profit':chalk.yellow(total.profit),
      '%': '',
      'Total ETH': chalk.yellow(total.all)
    };
  table.push(total_amount);


  table.push({'Coin' :'',
      'Initial Buy':' ',
      'Profit':'  ',
      '%':' ',
      'Total ETH': '+'
    });

  table.push({'Coin' :'',
      'Initial Buy':' ',
      'Profit':'  ',
      '%':'Remaining ETH',
      'Total ETH': remaining_ETH
    });

  table.push({'Coin' :'',
      'Initial Buy':'-------------------',
      'Profit':'-------------------',
      '%':'-------------------',
      'Total ETH': '-------------------'
    });

  table.push({'Coin' :'',
      'Initial Buy':' ',
      'Profit':'  ',
      '%':' ',
      'Total ETH': remaining_ETH+total.all
    });

  return table;
  
}
var apicall_cronjob = new CronJob('*/3 * * * * *', function() {

    axios.get('https://api.binance.com/api/v3/ticker/price')
    .then(function (response) {

        //clear the console
        const blank = '\n'.repeat(process.stdout.rows);
        console.log(blank);
        readline.cursorTo(process.stdout, 0, 0);
        readline.clearScreenDown(process.stdout);
      
        //get binance result for all markets
        let data=response.data;
        table = generate_coin_data(data,my_investment);

        console.table(table);
      })
  	.catch(function (error) {
    	console.log(error);
  	});
 


    }, function () {
        console.log('Woops apicall cron stopped!');
    },
    true /* Start the job right now */
); //end of cron


module.exports = app;
