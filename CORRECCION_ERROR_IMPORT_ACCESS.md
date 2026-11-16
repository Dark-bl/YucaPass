# Corrección del error de carga del pasaporte

El navegador solicitaba `js/features/access.js`, pero el módulo de acceso está ubicado en `js/core/access.js`.

En `js/features/dashboards.js` la ruta correcta es:

```js
const { loadGuestPortfolio } = await import('../core/access.js');
```

La ruta es relativa al archivo `js/features/dashboards.js`. No cambies `js/core/access.js` ni muevas carpetas.
