"use client"
import { useEffect, useRef, useState } from 'react';
import styles from './ClosestPair.css';
import * as d3 from 'd3';

const duration = 1500;

export default function Home() {
  const [points, setPoints] = useState([]);
  const svgRef = useRef(null);
  
  const svgWidth = 800;
  const svgHeight = 600;
  const margin = { top: 20, right: 40, bottom: 20, left: 40 };

  let xScale;
  let yScale;

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target.result;
      const parsedPoints = content
        .trim()
        .split('\n')
        .map((line) => {
          const [x, y] = line.split(',').map(Number);
          return { x, y };
        });
      setPoints(parsedPoints);
      drawCoordinates(parsedPoints);
    };
    reader.readAsText(file);
  };
  
  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.append('g').attr('id', 'axes'); // For drawing axes
  }, []);


  const clearButtonClicked = () => {
    setPoints([]);
    d3.select(svgRef.current).selectAll("*").remove();
  };
  

  const drawCoordinates = (points) => {
    const svg = d3.select(svgRef.current);
    svg.selectAll('.point').remove();
    svg.selectAll('#axes').selectAll("*").remove(); // Clear previous axes

    // Get min and max values for x and y
    const xExtent = d3.extent(points, d => d.x);
    const yExtent = d3.extent(points, d => d.y);

    // Define scales
    xScale = d3.scaleLinear()
      .domain([xExtent[0] - 10, xExtent[1] + 10]) // Add padding
      .range([margin.left, svgWidth - margin.right]);

    yScale = d3.scaleLinear()
      .domain([yExtent[0] - 10, yExtent[1] + 10]) // Add padding
      .range([svgHeight - margin.bottom, margin.top]);

    // Draw axes
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale);

    svg.select('#axes')
      .append('g')
      .attr('transform', `translate(0,${svgHeight - margin.bottom})`)
      .call(xAxis);

    svg.select('#axes')
      .append('g')
      .attr('transform', `translate(${margin.left},0)`)
      .call(yAxis);

    // Plot points with scaling applied
    svg.selectAll('circle')
      .data(points)
      .enter()
      .append('circle')
      .attr('cx', (d) => xScale(d.x))
      .attr('cy', (d) => yScale(d.y))
      .attr('r', 3)
      .attr('class', 'point')
      .attr('data-x', (d) => d.x)
      .attr('data-y', (d) => d.y)
      .on('mouseover', function(event, d) {
        showTooltip(event, d);
      })
      .on('mouseout', hideTooltip);
  };

  const showTooltip = (event, point) => {
    const tooltip = d3.select('#tooltip');
    tooltip.transition().duration(200).style('opacity', 1);
    tooltip
      .html(`(${point.x.toFixed(2)}, ${point.y.toFixed(2)})`)
      .style('left', `${event.pageX + 5}px`)
      .style('top', `${event.pageY + 5}px`);
  };

  const hideTooltip = () => {
    d3.select('#tooltip').transition().duration(200).style('opacity', 0);
  };

  const runButtonClicked = () => {
    d3.select(svgRef.current).selectAll('.pair-line').remove();
    d3.select(svgRef.current).selectAll('.division-line').remove();
    const pointsX = points.slice().sort((a, b) => a.x - b.x);
    const pointsY = points.slice().sort((a, b) => a.y - b.y);
    closestPairRec(pointsX, pointsY, null, null);
  };


  const distance = (p1, p2) => Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);

  const drawBoundary = (x) => {
    const xExtent = d3.extent(points, d => d.x);
    const yExtent = d3.extent(points, d => d.y);
        // Define scales
        xScale = d3.scaleLinear()
        .domain([xExtent[0] - 10, xExtent[1] + 10]) // Add padding
        .range([margin.left, svgWidth - margin.right]);
  
      yScale = d3.scaleLinear()
        .domain([yExtent[0] - 10, yExtent[1] + 10]) // Add padding
        .range([svgHeight - margin.bottom, margin.top]);
    // Apply the scale to the x value to get the pixel position
    const xScaled = xScale(x);

    return d3
      .select(svgRef.current)
      .append('line')
      .attr('x1', xScaled)
      .attr('y1', 0)
      .attr('x2', xScaled)
      .attr('y2', svgHeight)
      .attr('class', 'division-line')
      .attr('stroke', 'gray');
  };

  // Function to draw a pair of points with distance line
  const findDistance = (pair) => {
    const xExtent = d3.extent(points, d => d.x);
    const yExtent = d3.extent(points, d => d.y);
        // Define scales
        xScale = d3.scaleLinear()
        .domain([xExtent[0] - 10, xExtent[1] + 10]) // Add padding
        .range([margin.left, svgWidth - margin.right]);
  
      yScale = d3.scaleLinear()
        .domain([yExtent[0] - 10, yExtent[1] + 10]) // Add padding
        .range([svgHeight - margin.bottom, margin.top]);
    // Scale the coordinates of the points using xScale and yScale
    const x1 = xScale(pair[0].x);  // Map x1 to pixel value
    const y1 = yScale(pair[0].y);  // Map y1 to pixel value
    const x2 = xScale(pair[1].x);  // Map x2 to pixel value
    const y2 = yScale(pair[1].y);  // Map y2 to pixel value

    // Calculate the distance between the two points
    const dist = Math.sqrt((pair[0].x - pair[1].x) ** 2 + (pair[0].y - pair[1].y) ** 2).toFixed(2);

    const group = d3
      .select(svgRef.current)
      .append('g')
      .attr('class', 'pair-group');

    // Append the line element between points
    group.append('line')
      .attr('x1', x1)
      .attr('y1', y1)
      .attr('x2', x2)
      .attr('y2', y2)
      .attr('class', 'pair-line')
      .attr('stroke-width', 2);

    // Calculate midpoint for the distance label
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;

    // Append the distance label
    group.append('text')
      .attr('x', midX)
      .attr('y', midY - 5) // Position slightly above the midpoint
      .attr('class', 'distance-label')
      .attr('text-anchor', 'middle')
      .attr('stroke', 'blue')
      .text(`Dist: ${dist}`);

    return group;
  };

  // Function to highlight a subproblem area
  const highlightSubproblem = (xStart, xEnd, className) => {
    const xExtent = d3.extent(points, d => d.x);
    const yExtent = d3.extent(points, d => d.y);
        // Define scales
        xScale = d3.scaleLinear()
        .domain([xExtent[0] - 10, xExtent[1] + 10]) // Add padding
        .range([margin.left, svgWidth - margin.right]);
  
      yScale = d3.scaleLinear()
        .domain([yExtent[0] - 10, yExtent[1] + 10]) // Add padding
        .range([svgHeight - margin.bottom, margin.top]);
    const xStartScaled = xScale(xStart);  // Apply the scale to xStart
    const xEndScaled = xScale(xEnd);  // Apply the scale to xEnd

    return d3
      .select(svgRef.current)
      .append('rect')
      .attr('x', xStartScaled)
      .attr('y', 0)
      .attr('width', Math.max(0, xEndScaled - xStartScaled))
      .attr('height', svgHeight)
      .attr('class', className);
  };

  const bruteForce = (points) => {
    let minDist = Infinity;
    let closestPair = [];
    for (let i = 0; i < points.length; ++i) {
      for (let j = i + 1; j < points.length; ++j) {
        let dist = distance(points[i], points[j]);
        if (dist < minDist) {
          minDist = dist;
          closestPair = [points[i], points[j]];
        }
      }
    }
    return closestPair;
  };

  const closestPairRec = async (pointsX, pointsY, leftBoundary, rightBoundary) => {
    const subproblem = highlightSubproblem(leftBoundary, rightBoundary, 'subproblem');
    await new Promise((resolve) => setTimeout(resolve, duration));

    if (pointsX.length <= 3) {
      const closestPair = bruteForce(pointsX);
      const pair = findDistance(closestPair);
      await new Promise((resolve) => setTimeout(resolve, duration));
      subproblem.remove();
      return [closestPair, pair];
    }

    const midIdx = Math.floor(pointsX.length / 2);
    const midPoint = pointsX[midIdx];
    const midPointX = pointsX[midIdx].x;
    const boundary = drawBoundary(midPointX);
    await new Promise((resolve) => setTimeout(resolve, duration));

    subproblem.remove();

    const leftSubproblemRightBoundary = midPointX;
    const leftSubproblemLeftBoundary = leftBoundary !== null ? leftBoundary : pointsX[0].x;
    const [pairLeft, leftLine] = await closestPairRec(
      pointsX.slice(0, midIdx),
      pointsY.filter((p) => p.x < midPointX),
      leftSubproblemLeftBoundary,
      leftSubproblemRightBoundary
    );

    const rightSubproblemLeftBoundary = midPointX;
    const rightSubproblemRightBoundary = rightBoundary !== null ? rightBoundary : pointsX[pointsX.length - 1].x;
    const [pairRight, rightLine] = await closestPairRec(
      pointsX.slice(midIdx),
      pointsY.filter((p) => p.x >= midPointX),
      rightSubproblemLeftBoundary,
      rightSubproblemRightBoundary
    );

    const leftBlock = highlightSubproblem(leftSubproblemLeftBoundary, leftSubproblemRightBoundary, 'left-right');
    const rightBlock = highlightSubproblem(rightSubproblemLeftBoundary, rightSubproblemRightBoundary, 'left-right');

    await new Promise((resolve) => setTimeout(resolve, duration));

    let closestPair = pairLeft;
    let bestLine = leftLine;
    let notBestLine = rightLine;
    let minDist = distance(pairLeft[0], pairLeft[1]);

    if (minDist > distance(pairRight[0], pairRight[1])) {
      minDist = distance(pairRight[0], pairRight[1]);
      closestPair = pairRight;
      bestLine = rightLine;
      notBestLine = leftLine;
    }

    notBestLine.remove();
    await new Promise((resolve) => setTimeout(resolve, duration));

    const stripLeft = midPoint.x - minDist;
    const stripRight = midPoint.x + minDist;

    const stripBlock = highlightSubproblem(stripLeft, stripRight, 'strip');

    await new Promise((resolve) => setTimeout(resolve, duration));

    let changed = false;
    const strip = pointsY.filter((p) => Math.abs(p.x - midPoint.x) < minDist).sort((a, b) => a.y - b.y);;
    for (let i = 0; i < strip.length; ++i) {
      for (let j = i + 1; j < strip.length && strip[j].y - strip[i].y < minDist; ++j) {
        if (distance(strip[i], strip[j]) < minDist) {
          minDist = distance(strip[i], strip[j]);
          closestPair = [strip[i], strip[j]];
          changed = true;
        }
      }
    }

    if (changed) {
      leftLine.remove();
      rightLine.remove();
      bestLine = findDistance(closestPair);
      await new Promise((resolve) => setTimeout(resolve, duration));
    }

    leftBlock.remove();
    rightBlock.remove();
    boundary.remove();
    stripBlock.remove();
    await new Promise((resolve) => setTimeout(resolve, duration));
    return [closestPair, bestLine];
  };

  return (
    <div id="container">
        <h1 style={{color: 'white'}}>Closest Pair of Points (Divide and Conquer)</h1>
        <div id="buttons">
          <div className="file-upload-container">
        <label htmlFor="file-upload" className="custom-file-upload">
          Choose File
        </label>
        <input id="file-upload" type="file" />
        </div>
        <button onClick={clearButtonClicked}>Clear</button>
        <button onClick={runButtonClicked}>Run</button>
      </div>
      <div id="tooltip" style={{ position: 'absolute', background: 'lightgray', padding: '5px', opacity: 0 }}></div>
      <svg ref={svgRef} width={svgWidth} height={svgHeight}></svg>
    </div>
  );
}
