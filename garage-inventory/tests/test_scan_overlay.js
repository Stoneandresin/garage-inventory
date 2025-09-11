const assert = require('assert');
const path = require('path');
const { iou, ema } = require(path.join('..','app','static','js','scan.js'));

// IoU of identical boxes is 1
assert.strictEqual(iou({x:0,y:0,w:10,h:10},{x:0,y:0,w:10,h:10}), 1);
// IoU of non-overlapping boxes is 0
assert.strictEqual(iou({x:0,y:0,w:10,h:10},{x:20,y:20,w:5,h:5}), 0);
// EMA smoothing
assert.strictEqual(ema(0, 1, 0.5), 0.5);

console.log('overlay tests passed');
