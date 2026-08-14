export interface Parcel {
  coord_x: number;
  coord_y: number;
  color_code: string;
  color_index: number;
}

export type CanvasData = {
  id: string;
  title: string;
  description?: string;
  parcels: {[key: string]: Parcel};
  finished?: boolean;
  networkId?: number;
  svgData?: string;
};

export type ColorPlacement = {
  x: number;
  y: number;
  color: string;
  colorIndex: number;
};