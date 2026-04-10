(function initPlanetPage()
{
    const planetName = document.body.dataset.planet;
    if (!planetName)
    {
        return;
    }
    renderPlanetUI(planetName);
})();
