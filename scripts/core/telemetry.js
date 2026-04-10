const _tempMatrix = new THREE.Matrix4();
const _viewVector = new THREE.Vector3();

function updatePlanetTelemetry(spinGroup, tgtLabel, decSignFactor = 1)
{
    if (!tgtLabel || !tgtLabel.firstChild)
    {
        return;
    }

    _viewVector.set(0, 0, 1);
    _tempMatrix.copy(spinGroup.matrixWorld).invert();
    const local = _viewVector.applyMatrix4(_tempMatrix).normalize();

    let decRad   = Math.asin(local.y);
    decRad *= decSignFactor;
    const decDeg = decRad * (180 / Math.PI);

    let raLongRad = Math.atan2(-local.x, local.z);
    raLongRad     = raLongRad % (Math.PI * 2);
    if (raLongRad < 0)
    {
        raLongRad += Math.PI * 2;
    }

    const raLongTotalMinutes = (raLongRad / (Math.PI * 2)) * 24 * 60;
    const raLongH            = Math.floor(raLongTotalMinutes / 60);
    const raLongM            = Math.floor(raLongTotalMinutes % 60);
    const decSign            = decDeg >= 0 ? '+' : '-';
    const decVal             = Math.abs(Math.floor(decDeg));

    tgtLabel.firstChild.textContent =
        `TGT: RA ${raLongH.toString().padStart(2, '0')}h ${raLongM.toString().padStart(2, '0')}m | DEC ${decSign}${decVal.toString().padStart(2, '0')}° `;
}
