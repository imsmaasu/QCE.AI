import { ComponentInstance, BbsRow } from '../engine/types';
import { View2D, Scene3D, DrawingStyle } from './types';
import { buildFootingScene } from './footingScene';
import { buildColumnScene } from './columnScene';
import { buildBeamScene } from './beamScene';
import { buildSiteView2D } from './siteScene';
import { projectScene, ViewType } from './projection';

export * from './types';
export * from './formatting';
export * from './footingScene';
export * from './columnScene';
export * from './beamScene';
export * from './siteScene';
export * from './projection';

/**
 * Builds the 3D scene for a given component instance.
 */
export function buildComponentScene(
  component: ComponentInstance,
  computedRows: BbsRow[],
  allComponents: ComponentInstance[] = [],
): Scene3D {
  switch (component.type) {
    case 'footing':
      return buildFootingScene(component, computedRows, allComponents);
    case 'column':
      return buildColumnScene(component, computedRows);
    case 'beam':
      return buildBeamScene(component, computedRows);
    default:
      return {
        solids: [],
        bars: [],
        dimensions: [],
        levelMarks: [],
        leaders: [],
        sectionMarkers: [],
        title: component.name,
        notes: [],
      };
  }
}

/**
 * Unified entry point: Generates a 2D projected View from a component instance,
 * its computed BBS rows, and the selected view ID.
 */
export function generateView2D(
  component: ComponentInstance,
  computedRows: BbsRow[],
  allComponents: ComponentInstance[],
  viewId: ViewType,
  drawingStyle: DrawingStyle = 'textbook',
): View2D {
  if (viewId === 'site') {
    return buildSiteView2D(component, computedRows, allComponents, drawingStyle);
  }
  const scene = buildComponentScene(component, computedRows, allComponents);
  return projectScene(scene, viewId, drawingStyle);
}
