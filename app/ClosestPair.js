"use client"
import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

const duration = 1200;

export default function Home() {
  const [points, setPoints] = useState([]);
  const svgRef = useRef(null);
  const [isPaused, setIsPaused] = useState(false);
  
  const svgWidth = 800;
  const svgHeight = 600;

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
      drawPoints(parsedPoints);
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

  const drawPoints = (points) => {
    const svg = d3.select(svgRef.current);
    svg.selectAll('.point').remove();

    svg
      .selectAll('circle')
      .data(points)
      .enter()
      .append('circle')
      .attr('cx', (d) => d.x)
      .attr('cy', (d) => d.y)
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
    run();
  };

  const run = () => {
    d3.select(svgRef.current).selectAll('.pair-line').remove();
    d3.select(svgRef.current).selectAll('.division-line').remove();
    const pointsX = points.slice().sort((a, b) => a.x - b.x);
    const pointsY = points.slice().sort((a, b) => a.y - b.y);
    closestPairRec(pointsX, pointsY, null, null);
  };

  const distance = (p1, p2) => Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);

  const drawPair = (pair) => {
    return d3
      .select(svgRef.current)
      .append('line')
      .attr('x1', pair[0].x)
      .attr('y1', pair[0].y)
      .attr('x2', pair[1].x)
      .attr('y2', pair[1].y)
      .attr('class', 'pair-line')
      .attr('stroke', 'blue')
      .attr('stroke-width', 2);
  };

  const highlightSubproblem = (xStart, xEnd, className) => {
    return d3
      .select(svgRef.current)
      .append('rect')
      .attr('x', xStart)
      .attr('y', 0)
      .attr('width', Math.max(0, xEnd - xStart))
      .attr('height', svgHeight)
      .attr('class', className);
  };

  const drawBoundary = (x) => {
    return d3
      .select(svgRef.current)
      .append('line')
      .attr('x1', x)
      .attr('y1', 0)
      .attr('x2', x)
      .attr('y2', svgHeight)
      .attr('class', 'division-line')
      .attr('stroke', 'gray');
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
      const pair = drawPair(closestPair);
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
    const strip = pointsY.filter((p) => Math.abs(p.x - midPoint.x) < minDist);
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
      bestLine = drawPair(closestPair);
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
    <div>
      <div>
      <input type="file" onChange={handleFileUpload} />
        <button onClick={clearButtonClicked}>Clear</button>
        <button onClick={runButtonClicked}>Run</button>
      </div>
      <div id="tooltip" style={{ position: 'absolute', background: 'lightgray', padding: '5px', opacity: 0 }}></div>
      <svg ref={svgRef} width={svgWidth} height={svgHeight}></svg>
    </div>
  );
}



