import React, { Suspense, lazy } from "react";
import { CanvasBoardRenderer } from "./CanvasBoardRenderer.jsx";

const LegacySvgViewport = lazy(() =>
  import("./LegacySvgViewport.jsx").then(module => ({ default: module.LegacySvgViewport }))
);

export function GameViewport({ controller }) {
  const {
    activeRenderer,
    svgRef,
    gRef,
    wW,
    wH,
    onMD,
    onMM,
    onMU,
    onWh,
    onCanvasMove,
    onCanvasLeave,
    onCanvasClick,
    onCanvasContext,
    boardHexes,
    terrainCanvasTiles,
    entityCanvasTiles,
    overlayCanvasTiles,
    borderOverlay,
    cityBannerOverlay,
    overlayRef,
    animVisuals,
    animatingUnitId,
    combatAnims,
    tooltipData,
  } = controller;

  return activeRenderer === "canvas" ? (
    <CanvasBoardRenderer
      svgRef={svgRef}
      gRef={gRef}
      wW={wW}
      wH={wH}
      onMouseDown={onMD}
      onMouseMove={onCanvasMove}
      onMouseUp={onMU}
      onMouseLeave={onCanvasLeave}
      onClick={onCanvasClick}
      onContextMenu={onCanvasContext}
      onWheel={onWh}
      boardHexes={boardHexes}
      terrainCanvasTiles={terrainCanvasTiles}
      entityCanvasTiles={entityCanvasTiles}
      overlayCanvasTiles={overlayCanvasTiles}
      borderOverlay={borderOverlay}
      cityBannerOverlay={cityBannerOverlay}
      overlayRef={overlayRef}
      animVisuals={animVisuals}
      animatingUnitId={animatingUnitId}
      combatAnims={combatAnims}
      tooltipData={tooltipData}
    />
  ) : (
    <Suspense fallback={<div style={{position:"absolute",inset:0,zIndex:1,background:"rgba(10,14,6,.15)"}} />}>
      <LegacySvgViewport controller={controller}/>
    </Suspense>
  );
}
