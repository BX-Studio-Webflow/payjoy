import { CareersController } from '$utils/careers';

window.Webflow ||= [];
window.Webflow.push(() => {
  const careersController = new CareersController();
  void careersController.init();
});
