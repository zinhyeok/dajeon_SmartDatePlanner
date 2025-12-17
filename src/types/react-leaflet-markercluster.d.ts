declare module '@changey/react-leaflet-markercluster' {
  import { Component } from 'react';
  import { LatLngExpression } from 'leaflet';

  interface MarkerClusterGroupProps {
    children?: React.ReactNode;
    chunkedLoading?: boolean;
    maxClusterRadius?: number;
    spiderfyOnMaxZoom?: boolean;
    showCoverageOnHover?: boolean;
    zoomToBoundsOnClick?: boolean;
    iconCreateFunction?: (cluster: any) => any;
    [key: string]: any;
  }

  export default class MarkerClusterGroup extends Component<MarkerClusterGroupProps> {}
}


