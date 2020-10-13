import mesh from 'tinyjs-plugin-mesh';
import CreatureHaxeBaseRenderer from './CreatureHaxeBaseRenderer';

const { Mesh } = mesh;

class CreaturePackRenderer extends Mesh {
  constructor(packData, texture) {
    super(texture);

    this.packData = packData;
    this.packRenderer = new CreatureHaxeBaseRenderer(this.packData);
    this.texture = texture;
    this.blendMode = Tiny.BLEND_MODES.NORMAL;
    this.creatureBoundsMin = new Tiny.Point(0, 0);
    this.creatureBoundsMax = new Tiny.Point(0, 0);
    this.vertices = new Float32Array(this.packRenderer.renderPoints.length);
    this.uvs = new Float32Array(this.packRenderer.renderUvs.length);
    this.indices = new Uint16Array(this.packData.indices.length);

    for (let i = 0; i < this.indices.length; i++) {
      this.indices[i] = this.packData.indices[i];
    }

    this.colors = new Float32Array([1, 1, 1, 1]);
    this.updateRenderData(this.packData.points, this.packData.uvs);
    this.drawMode = Mesh.DRAW_MODES.TRIANGLES;
  }

  _refresh() {
    this.packRenderer.syncRenderData();

    const { renderPoints: points, renderUvs: uvs } = this.packRenderer;

    this.updateRenderData(points, uvs);
    this.dirty++;
  }

  updateRenderData(points, uvs) {
    const { renderPoints, renderUvs } = this.packRenderer;

    for (let i = 0; i < renderPoints.length; i += 2) {
      this.vertices[i] = renderPoints[i];
      this.vertices[i + 1] = -renderPoints[i + 1];
      this.uvs[i] = renderUvs[i];
      this.uvs[i + 1] = renderUvs[i + 1];
    }
  }
}

export default CreaturePackRenderer;
