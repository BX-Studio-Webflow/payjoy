import { MapController } from '$utils/map';

window.Webflow ||= [];
window.Webflow.push(() => {
  const mapController = new MapController();
  mapController.init();
});
