/* eslint-disable no-undef */
function debounce(func, timeout = 300) {
  let timer
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => func.apply(this, args), timeout)
  }
}

/**
 * Compute any eyepiece properties which depend on user input.
 *
 * @param {any} data Array of objects containing entries for the eyepieces table.
 * @returns Array<any> A cleaned array with simple keys and values to display.
 */
function processEyepieces(data, telescopeFL = NaN, telescopeFR = NaN) {
  return data.map((item) => {
    const magnificationNominal = telescopeFL / item.focalLengthNominal
    return {
      ...item,
      magnificationNominal,
      exitPupilNominal: item.focalLengthNominal / telescopeFR,
      tfovNominal: item.afov / magnificationNominal,
    }
  })
}

/**
 * Rename the columns of the data from ernests_list.json, which itself is scraped from
 * Ernest's list of eyepiece stats/measurements from astro-talks.ru.
 *
 * @param {any} data Array of objects containing entries for the eyepieces table.
 * @returns Array<any> An array with simple keys and values to display.
 */
function processEyepiecesJSON(data) {
  return data.map((item) => {
    return {
      brand: item['1 Brand'],
      model: item['Model'],
      manufacturer: item['MFR'],
      category: item['Category'],
      focalLengthNominal: item['FL'],
      diameter: item['Diam.'],
      afov: item['AFOV'],
      weight: item['Wt.'],
      eyeRelief: item['Eye Relief'],
      fieldStopNominal: item["Mfr's Field Stop "],
      fieldStopCalculated: item['Calc.FieldStop'],
      undercuts: item['Undercuts?'],
      coatings: item['Coatings'],
      blackenedEdge: item['Edge black'],
      nElements: item['Elem.'],
      magnificationNominal: NaN,
      exitPupilNominal: NaN,
      tfovNominal: NaN,
    }
  })
}

document.addEventListener('DOMContentLoaded', () => {
  const inputFL = document.getElementById('telescope-focal-length')
  const inputFR = document.getElementById('telescope-focal-ratio')

  inputFL.oninput = debounce(updateUI)
  inputFL.onpaste = inputFL.oninput()

  inputFR.oninput = debounce(updateUI)
  inputFR.onpaste = inputFR.oninput()
})

function updateUI() {
  const inputFL = document.getElementById('telescope-focal-length')
  const inputFR = document.getElementById('telescope-focal-ratio')

  updateTable(inputFL.value, inputFR.value)
}

// eslint-disable-next-line no-undef
const table = new Tabulator('#grid-wrapper', {
  height: 0.95 * document.querySelector('article.bd-article').offsetHeight,
  columns: [
    { field: 'brand', title: 'Brand' },
    { field: 'model', title: 'Model' },
    { field: 'manufacturer', title: 'Manufacturer' },
    { field: 'category', title: 'Category' },
    { field: 'focalLengthNominal', title: 'Nominal FL [mm]' },
    { field: 'diameter', title: 'Barrel Diameter [in]' },
    { field: 'afov', title: 'Nominal AFOV [°]' },
    { field: 'weight', title: 'Weight [g]' },
    { field: 'eyeRelief', title: 'Eye Relief [mm]' },
    { field: 'fieldStopNominal', title: 'Field Stop (Nominal) [mm]' },
    { field: 'fieldStopCalculated', title: 'Field Stop (Calculated) [mm]' },
    { field: 'undercuts', title: 'Undercuts' },
    { field: 'coatings', title: 'Coatings' },
    { field: 'blackenedEdge', title: 'Blackened Edge' },
    { field: 'nElements', title: 'Number of Elements' },
    { field: 'magnificationNominal', title: 'Magnification (Nominal)' },
    { field: 'exitPupilNominal', title: 'Exit Pupil (Nominal) [mm]' },
    { field: 'tfovNominal', title: 'TFOV (Nominal) [°]' },
  ],
})

let tableData = undefined

fetch('../../_static/eyepiece_buyers_guide_fixed.json')
  .then((response) => response.json())
  .then((rawData) => {
    tableData = processEyepiecesJSON(rawData)
    table.setData(tableData)
    makePlot(
      tableData,
      'focalLengthNominal',
      'afov',
      'Focal Length [mm]',
      'AFOV [°]',
      0,
      null,
      0,
      null
    )
  })

function updateTable(telescopeFL, telescopeFR) {
  tableData = processEyepieces(
    tableData,
    telescopeFL === '' ? NaN : telescopeFL,
    telescopeFR === '' ? NaN : telescopeFR
  )
  table.replaceData(tableData)
}

function makePlot(
  data,
  xKey,
  yKey,
  xLabel,
  yLabel,
  xi = null,
  xf = null,
  yi = null,
  yf = null
) {
  // set the dimensions and margins of the graph
  const margin = { top: 10, right: 30, bottom: 30, left: 60 }
  const width = 460 - margin.left - margin.right
  const height = 450 - margin.top - margin.bottom

  // Get the dimensions of the data
  const xVals = data.map((item) => item[xKey]).filter((val) => !isNaN(val))
  const yVals = data.map((item) => item[yKey]).filter((val) => !isNaN(val))
  const xDomain = [xi ?? Math.min(...xVals), xf ?? Math.max(...xVals)]
  const yDomain = [yi ?? Math.min(...yVals), yf ?? Math.max(...yVals)]

  // append the svg object to the body of the page
  const svg = d3
    .select('#vis')
    .append('svg')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', [0, 0, width, height])
    .attr('preserveAspectRatio', 'xMinYMin')
    .append('g')
    .attr('transform', `translate(${margin.left}, ${margin.top})`)

  // Add X axis
  const x = d3.scaleLinear().domain(xDomain).range([0, width])
  svg
    .append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0, ${height})`)
    .call(d3.axisBottom(x))

  // Add Y axis
  const y = d3.scaleLinear().domain(yDomain).range([height, 0])
  svg.append('g').attr('class', 'y-axis').call(d3.axisLeft(y))

  // Add X axis label
  svg
    .append('text')
    .attr('text-anchor', 'end')
    .attr('x', width / 2 + margin.left)
    .attr('y', height + margin.top + 20)
    .text(xLabel ?? xKey)

  // Y axis label
  svg
    .append('text')
    .attr('text-anchor', 'end')
    .attr('transform', 'rotate(-90)')
    .attr('y', -margin.left + 20)
    .attr('x', -margin.top - height / 2 + 20)
    .text(yLabel ?? yKey)

  // Add a tooltip div. Here I define the general feature of the tooltip: stuff that do not depend on the data point.
  // Its opacity is set to 0: we don't see it by default.
  const tooltip = d3
    .select('#vis')
    .append('div')
    .style('opacity', 0)
    .attr('class', 'tooltip')
    .style('background-color', 'white')
    .style('border', 'solid')
    .style('border-width', '1px')
    .style('border-radius', '5px')
    .style('padding', '10px')

  // A function that change this tooltip when the user hover a point.
  // Its opacity is set to 1: we can now see it. Plus it set the text and position of tooltip depending on the datapoint (d)
  const mouseover = () => tooltip.style('opacity', 1)
  const mousemove = function (event, d) {
    tooltip
      .html(`${d.brand} ${d.model} ${d.focalLengthNominal} mm`)
      .style('left', event.x / 2 + 'px') // It is important to put the +90: other wise the tooltip is exactly where the point is an it creates a weird effect
      .style('top', event.y / 2 + 'px')
  }

  // A function that change this tooltip when the leaves a point: just need to set opacity to 0 again
  const mouseleave = () =>
    tooltip.transition().duration(200).style('opacity', 0)

  // Add scatter points
  svg
    .append('g')
    .selectAll('dot')
    .data(
      data.filter(
        (item) =>
          !isNaN(item[xKey]) &&
          !isNaN(item[yKey]) &&
          item[xKey] != null &&
          item[yKey] != null
      )
    ) // Filter out nullish and NaN values
    .enter()
    .append('circle')
    .attr('cx', (d) => x(d[xKey]))
    .attr('cy', (d) => y(d[yKey]))
    .attr('r', 7)
    .style('opacity', 0.3)
    .attr('class', 'datapoint')
    .on('mouseover', mouseover)
    .on('mousemove', mousemove)
    .on('mouseleave', mouseleave)
}
