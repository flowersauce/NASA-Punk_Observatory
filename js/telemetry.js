// NASA-Punk Project: Telemetry Module

const _tempMatrix = new THREE.Matrix4();
const _viewVector = new THREE.Vector3();

/**
 * 统一遥测计算模型 V2.0：几何交点反推坐标。
 * * 此模型明确将摄像机视线方向转换到星球的“体固定自转参考系”（Body-Fixed Frame）
 * 来获取星球表面上被观察点的经度（RA）和纬度（Dec）。
 * @param {THREE.Group} spinGroup - 定义天体自转的 THREE.Group。
 * @param {HTMLElement} tgtLabel - 用于显示结果的 HTML 元素。
 * @param {number} [decSignFactor=1] - 赤纬符号修正乘数：用于处理极高轴倾角（如天王星 >90°）的情况。
 */
function updatePlanetTelemetry(spinGroup, tgtLabel, decSignFactor = 1)
{
    if (!tgtLabel || !tgtLabel.firstChild)
    {
        return;
    }

    // 1. 确定交点向量 (Vector to Surface Intersection)

    // 视线方向（在 World Space 中）：
    // 由于相机居中且面向世界原点，视线方向是沿着 Z 轴负方向的逆方向 (0, 0, 1)。
    // 我们只需要这个方向向量在星球“体固定系”中的表示。
    _viewVector.set(0, 0, 1);

    // 2. 构造 Body-Fixed Frame 的逆矩阵 (Tilt * Spin)^-1
    // spinGroup.matrixWorld 包含了所有的世界变换 (Group.rotation * M_Tilt * M_Spin)。
    // 逆矩阵 M^-1 将 World 坐标系中的向量转换到 Body-Fixed 坐标系中。
    _tempMatrix.copy(spinGroup.matrixWorld).invert();

    // 3. 转换交点向量到 Body-Fixed Frame
    // local 现在代表了交点在星球自转参考系中的 normalized 坐标。
    const local = _viewVector.applyMatrix4(_tempMatrix).normalize();

    // 4. 提取坐标 (Lat/Long)

    // Latitude / Dec: 由 local.y 分量决定
    // local.y 越大，越靠近北极（+90°）。
    let decRad = Math.asin(local.y);
    decRad *= decSignFactor; // <--- 应用符号修正，统一处理天王星等特殊情况

    const decDeg = decRad * (180 / Math.PI);

    // Longitude / RA: 由 local.x 和 local.z 决定
    // atan2(-X, Z) 遵循 RA (向东增加) 的经度惯例。
    let raLongRad = Math.atan2(-local.x, local.z);

    // 5. 格式化输出

    // 保持在 0 到 2*PI 范围内 (0h 到 24h)
    raLongRad = raLongRad % (Math.PI * 2);
    if (raLongRad < 0)
    {
        raLongRad += Math.PI * 2;
    }

    const raLongTotalMinutes = (raLongRad / (Math.PI * 2)) * 24 * 60;
    const raLongH            = Math.floor(raLongTotalMinutes / 60);
    const raLongM            = Math.floor(raLongTotalMinutes % 60);

    const decSign = decDeg >= 0 ? "+" : "-";
    const decVal  = Math.abs(Math.floor(decDeg));

    tgtLabel.firstChild.textContent = `TGT: RA ${raLongH.toString().padStart(2, '0')}h ${raLongM.toString().padStart(2, '0')}m | DEC ${decSign}${decVal.toString().padStart(2, '0')}° `;
}