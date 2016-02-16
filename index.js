var express = require('express')
var bodyParser = require('body-parser')
app = express();

var port = process.env.PORT || 3000;

app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());


var cache = {};

app.post('/', function(req, res) {
  console.log(req.body.image);
  var getPixels = require('get-pixels');
  var fs = require('fs')

  if (cache.hasOwnProperty(req.body.image)) {
    var c = cache[req.body.image];
    if (typeof c.then !== 'undefined') {
      c.then(val => res.json(val)).catch(err => res.status(400).send('error'))
    } else {
      res.json(c);
    }
    return;
  }

  if (typeof c)

  Array.prototype.equals = function(arr) {
    if (this.length !== arr.length) return false
    for (var i = 0; i < this.length; i++) {
      if (this[i] !== arr[i]) return false
    }
    return true;
  }

  Getter = function(px, name) {
    var ret = function(x, y) {
      var ret = [];
      for (var i = 0; i < 4; i++) {
        ret.push(px.data[(y * px.shape[0] + x)*4 + i]);
      }
      return ret;
    }
    ret.shape = px.shape;
    return ret;
  }

  var getImage = function(name) {
    return new Promise((resolve, reject) => {
      getPixels(name, (err, px) => {
        if (err) {
          reject();
          return;
        }
        var getter = Getter(px, name);
        getter.label = name.match(/[^\.\/]+/g)[1];
        resolve(getter);
      })
    })
  }

  var compare = function(X, Y, get1, get2) {
    for (var x = 0; x < get2.shape[0]; x++) {
      for (var y = 0; y < get2.shape[1]; y++) {
        if (!get1(X + x, Y + y).equals(get2(x, y))) return false
      }
    }
    return true;
  }


  var Image;
  var anchor;
  var anchorPos;
  var goals = []
  var bingoBoard = [];

  cache[req.body.image] = new Promise((resolve, reject) => {
    getImage('http://i.imgur.com/' + req.body.image + '.png').then(get => {
      Image = get;
      return getImage('anchor.png');
    }).then(get => {
      anchor = get;
      loop:
      for (var x = 0; x < Image.shape[0]; x++) {
        for (var y = 0; y < Image.shape[0]; y++) {
          if (compare(x, y, Image, anchor)) {
            anchorPos = {x: x, y: y};
            break loop;
          }
        }
      }
      var x = anchorPos.x + 2;
      var y = anchorPos.y + 2;
      var rows = [];
      for (var i = 0; i < 5; i++) {
        var row = { x: x };
        while(Image(x, y).equals([0, 0, 0, 255])) {
          x++;
        }
        row.width = x - row.x;
        rows.push(row);
        x++;
      }
      var x = anchorPos.x + 2;
      var y = anchorPos.y + 2;
      var cols = [];
      for (var i = 0; i < 5; i++) {
        var col = { y: y };
        while(Image(x, y).equals([0, 0, 0, 255])) {
          y++;
        }
        col.height = y - col.y;
        cols.push(col);
        y++;
      }
      for (var y = 0; y < 5; y++) {
        for (var x = 0; x < 5; x++) {
          goals.push({ x: rows[x].x, y: cols[y].y, width: rows[x].width, height: cols[y].height })
        }
      }
      for (var i = 0; i < 25; i++) {
        var goal = goals[i];
        goal.lines = [];
        var etc = true;
        var numLines = 0;
        var top = 0;
        for (var y = goal.y; y < goal.y + goal.height; y++) {
          var black = true;
          for (var x = goal.x; x < goal.x + goal.width; x++) {
            if (!Image(x, y).equals([0, 0, 0, 255])) {
              black = false;
              break;
            }
          }
          if (etc && !black) {
            top = y;
            etc = false;
            numLines++;
          }
          if (!etc && black) {
            goal.lines.push({top: top, bottom: y})
            etc = true;
          }
        }
      }
      var letterFiles = fs.readdirSync('letters')
      var letterPromises = [];
      for (var i = 0; i < letterFiles.length; i++) {
        letterPromises.push(getImage('letters/' + letterFiles[i]))
      }
      return Promise.all(letterPromises);
    }).then(letters => {
      for (var i = 0; i < 25; i++) {
        var parsed = "";
        for (var j = 0; j < goals[i].lines.length; j++) {
          var blacklines = 0;
          for (var x = goals[i].x; x < goals[i].x + goals[i].width; x++) {
            var black = true;
            for (var y = goals[i].lines[j].top; y < goals[i].lines[j].bottom; y++) {
              if (!Image(x, y).equals([0, 0, 0, 255])) black = false;
              for (var l = 0; l < letters.length; l++) {
                if (compare(x, y, Image, letters[l])) {
                  if (blacklines > 0) {
                    if (parsed.length > 0) parsed += " ";
                    blacklines = 0;
                  }
                  parsed += letters[l].label;
                  x += letters[l].shape[0] - 1;
                  y = goals[i].lines[j].top;
                }
              }
            }
            if (black) blacklines++;
          }
        }
        parsed = parsed.replace(/\sb/g, "b")
        parsed = parsed.replace(/^l/g, "I")
        parsed = parsed.replace(/\sl/g, " I")
        bingoBoard[ i + 1] = {name: parsed}
      }
      resolve(bingoBoard);
    }).catch(err => {
      reject(err);
    });
  }).then(val => {
    cache[req.body.image] = val;
    res.json(val)
  }).catch(err => {
    res.status(400).send('error');
  })

})

app.listen(port)


//
// getPixels('test.png', (err, px) => {
//   console.log([1,2].equals([1,2,3]))
//   var width = px.shape[0]
//   var height= px.shape[1]
//   var get = Getter(px)
//
//   compare = function(x, y, w, h, get1, get2) {
//     for (var X = x; X < x + w; X++) {
//       for (var Y = y; Y < y + h; Y++) {
//         if (!get1(X, Y).equals(get2(X - x, Y - y))) return false
//       }
//     }
//     return true;
//   }
//   for (var x = 0; x < width; x++) {
//     for (var y = 0; y < height; y++) {
//       if (get(x, y).equals([10, 36, 90, 255]) && get(x - 1, y - 1).equals([0, 4, 9, 255])) {
//         console.log(x + ' ' + y)
//       }
//     }
//   }
// })
