var d3 = require('d3');
var debug = require('debug')('transitive:display');

var SphericalMercator = require('./spherical-mercator');

var sm = new SphericalMercator();

/**
 * Expose `Display`
 */

module.exports = Display;

/**
 * The D3-based SVG display.
 *
 * @param {Object} options
 */

function Display(transitive) {
  var el = this.el = transitive.options.el;
  this.width = el.clientWidth;
  this.height = el.clientHeight;

  // Set up the pan/zoom behavior
  var zoom = this.zoom = d3.behavior.zoom()
    .scaleExtent([0.25, 4]);

  // set up the svg display
  var div = d3.select(el)
    .attr('class', 'Transitive')
    .call(zoom);

  this.svg = div
    .append('svg')
    .attr('class', 'schematic-map');

  // initialize the x/y scale objects
  this.xScale = d3.scale.linear();
  this.yScale = d3.scale.linear();

  // set up the resize event handler
  d3.select(window).on('resize.display', (function() {
    this.resize(el.clientHeight, el.clientWidth);
    transitive.refresh();
  }).bind(this));
}

/**
 * Empty the display
 */

Display.prototype.empty = function() {
  debug('emptying svg');
  this.svg.selectAll('*').remove();

  this.haloLayer = this.svg.insert('g', ':first-child');
};

/**
 * Set the scale
 */

Display.prototype.setScale = function(height, width, bounds, options) {

  this.height = height;
  this.width = width;

  var domains = getDomains(this, height, width, bounds, options);
  this.xScale.domain(domains[0]);
  this.yScale.domain(domains[1]);

  this.xScale.range([0, width]);
  this.yScale.range([height, 0]);

  debug('x scale %j -> %j', this.xScale.domain(), this.xScale.range());
  debug('y scale %j -> %j', this.yScale.domain(), this.yScale.range());

  this.zoom
    .x(this.xScale)
    .y(this.yScale);
};

Display.prototype.resize = function(newHeight, newWidth) {

  var xDomain = this.xScale.domain();
  var xFactor = newWidth / this.width;
  var xDomainAdj = (xDomain[1] - xDomain[0]) * (xFactor - 1) / 2;
  this.xScale.domain([xDomain[0] - xDomainAdj, xDomain[1] + xDomainAdj]);

  var yDomain = this.yScale.domain();
  var yFactor = newHeight / this.height;
  var yDomainAdj = (yDomain[1] - yDomain[0]) * (yFactor - 1) / 2;
  this.yScale.domain([yDomain[0] - yDomainAdj, yDomain[1] + yDomainAdj]);

  this.xScale.range([0, newWidth]);
  this.yScale.range([newHeight, 0]);

  this.height = newHeight;
  this.width = newWidth;

  this.zoom
    .x(this.xScale)
    .y(this.yScale);
};

Display.prototype.xyBounds = function() {
  var x = this.xScale.domain();
  var y = this.yScale.domain();
  return [
    [x[0], y[1]],
    [x[1], y[0]]
  ];
};

/**
 * Lat/lon bounds
 */

Display.prototype.llBounds = function() {
  var x = this.xScale.domain();
  var y = this.yScale.domain();

  return [
    sm.inverse([x[0], y[1]]),
    sm.inverse([x[1], y[0]])
  ];
};

Display.prototype.isInRange = function(x, y) {
  var xRange = this.xScale.range();
  var yRange = this.yScale.range();

  return x >= xRange[0] && x <= xRange[1] && y >= yRange[1] && y <= yRange[0];
};

/**
 * Compute the x/y coordinate space domains to fit the graph.
 */

function getDomains(display, height, width, bounds, options) {
  var xmin = bounds[0][0],
    xmax = bounds[1][0];
  var ymin = bounds[1][1],
    ymax = bounds[0][1];
  var xRange = xmax - xmin;
  var yRange = ymax - ymin;

  var paddingFactor = (options && options.paddingFactor) ?
    options.paddingFactor : 0.1;

  var margins = getMargins(options);

  var usableHeight = height - margins.top - margins.bottom;
  var usableWidth = width - margins.left - margins.right;
  var displayAspect = width / height;
  var usableDisplayAspect = usableWidth / usableHeight;
  var graphAspect = xRange / (yRange === 0 ? -Infinity : yRange);

  var padding;
  var dispX1, dispX2, dispY1, dispY2;
  var dispXRange, dispYRange;

  if (usableDisplayAspect > graphAspect) { // y-axis is limiting
    padding = paddingFactor * yRange;
    dispY1 = ymin - padding;
    dispY2 = ymax + padding;
    dispYRange = yRange + 2 * padding;
    var addedYRange = (height / usableHeight * dispYRange) - dispYRange;
    if (margins.top > 0 || margins.bottom > 0) {
      dispY1 -= margins.bottom / (margins.bottom + margins.top) * addedYRange;
      dispY2 += margins.top / (margins.bottom + margins.top) * addedYRange;
    }
    dispXRange = (dispY2 - dispY1) * displayAspect;
    var xOffset = (margins.left - margins.right) / width;
    var xMidpoint = (xmax + xmin - dispXRange * xOffset) / 2;
    dispX1 = xMidpoint - dispXRange / 2;
    dispX2 = xMidpoint + dispXRange / 2;
  } else { // x-axis limiting
    padding = paddingFactor * xRange;
    dispX1 = xmin - padding;
    dispX2 = xmax + padding;
    dispXRange = xRange + 2 * padding;
    var addedXRange = (width / usableWidth * dispXRange) - dispXRange;
    if (margins.left > 0 || margins.right > 0) {
      dispX1 -= margins.left / (margins.left + margins.right) * addedXRange;
      dispX2 += margins.right / (margins.left + margins.right) * addedXRange;
    }

    dispYRange = (dispX2 - dispX1) / displayAspect;
    var yOffset = (margins.bottom - margins.top) / height;
    var yMidpoint = (ymax + ymin - dispYRange * yOffset) / 2;
    dispY1 = yMidpoint - dispYRange / 2;
    dispY2 = yMidpoint + dispYRange / 2;
  }

  return [
    [dispX1, dispX2],
    [dispY1, dispY2]
  ];
}

function getMargins(options) {
  var margins = {
    left: 0,
    right: 0,
    top: 0,
    bottom: 0
  };

  if (options && options.displayMargins) {
    if (options.displayMargins.top) margins.top = options.displayMargins.top;
    if (options.displayMargins.bottom) margins.bottom = options.displayMargins.bottom;
    if (options.displayMargins.left) margins.left = options.displayMargins.left;
    if (options.displayMargins.right) margins.right = options.displayMargins.right;
  }

  return margins;
}
