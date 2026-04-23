// Baidu Map WebGL SDK type declarations
// https://lbsyun.baidu.com/index.php?title=jspopularGL/guide/bindbindbindbindbindbindbindbindbindbindbindbingetbindbingetbingetbindbingetbingetbindbingetbingetbindbingetbingetbindbingetbingetbindbingetbingetbindbingetbingetbindbingetbingetbinget

/* eslint-disable @typescript-eslint/no-explicit-any */

declare namespace BMapGL {
  class Point {
    lng: number;
    lat: number;
    constructor(lng: number, lat: number);
  }

  interface MapOptions {
    enableRotate?: boolean;
    enableTilt?: boolean;
  }

  interface MapClickEvent {
    latlng: Point;
  }

  class Map {
    constructor(container: HTMLElement | string, opts?: MapOptions);
    centerAndZoom(center: Point, zoom: number): void;
    enableScrollWheelZoom(enabled: boolean): void;
    addOverlay(overlay: Overlay): void;
    removeOverlay(overlay: Overlay): void;
    addControl(control: Control): void;
    addEventListener(event: 'click', handler: (e: MapClickEvent) => void): void;
    addEventListener(event: string, handler: (e: any) => void): void;
  }

  interface Control {
    // Base control interface
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Overlay {
    // Base overlay interface
  }

  class Marker implements Overlay {
    constructor(point: Point, opts?: MarkerOptions);
  }

  interface MarkerOptions {
    offset?: Size;
    icon?: Icon;
    enableMassClear?: boolean;
    enableDragging?: boolean;
    title?: string;
  }

  interface Size {
    width: number;
    height: number;
  }

  interface Icon {
    // Icon interface
  }

  interface GeocoderResult {
    address: string;
    business: string;
    city: string;
    cityCode: number;
    district: string;
    province: string;
    street: string;
    streetNumber: string;
  }

  class Geocoder {
    getLocation(point: Point, callback: (result: GeocoderResult) => void): void;
  }

  interface AutocompleteOptions {
    input: HTMLInputElement | string;
    location?: Map | string;
    onSearchComplete?: (result: AutocompleteResult) => void;
  }

  interface AutocompleteResult {
    // Autocomplete result interface
  }

  interface AutocompleteConfirmEvent {
    item: {
      value: {
        province: string;
        city: string;
        district: string;
        street: string;
        business: string;
      };
    };
  }

  class Autocomplete {
    constructor(opts: AutocompleteOptions);
    addEventListener(event: 'onconfirm', handler: (e: AutocompleteConfirmEvent) => void): void;
    addEventListener(event: string, handler: (e: any) => void): void;
  }

  interface LocalSearchOptions {
    renderOptions?: RenderOptions;
    onSearchComplete?: (results: LocalSearchResult) => void;
    onSearchMarkersSet?: (markers: Marker[]) => void;
    pageCapacity?: number;
  }

  interface RenderOptions {
    map?: Map;
    panel?: HTMLElement | string;
    selectFirstResult?: boolean;
    autoViewport?: boolean;
  }

  interface LocalSearchResult {
    getCurrentNumPois(): number;
    getPoi(index: number): LocalResultPoi;
  }

  interface LocalResultPoi {
    point: Point;
    title: string;
    address: string;
    city: string;
    phoneNumber: string;
    postcode: string;
    type: string;
    isAccurate: boolean;
    province: string;
    tags: string[];
    detailUrl: string;
  }

  class LocalSearch {
    constructor(map: Map, opts?: LocalSearchOptions);
    search(keyword: string): void;
  }

  class ScaleControl implements Control {
    constructor();
  }

  class ZoomControl implements Control {
    constructor();
  }
}

declare const BMapGL: {
  Map: typeof BMapGL.Map;
  Marker: typeof BMapGL.Marker;
  Geocoder: typeof BMapGL.Geocoder;
  Autocomplete: typeof BMapGL.Autocomplete;
  LocalSearch: typeof BMapGL.LocalSearch;
  Point: typeof BMapGL.Point;
  ScaleControl: typeof BMapGL.ScaleControl;
  ZoomControl: typeof BMapGL.ZoomControl;
};
