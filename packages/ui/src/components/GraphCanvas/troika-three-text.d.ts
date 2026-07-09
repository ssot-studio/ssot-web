/**
 * troika-three-text 는 타입 선언을 배포하지 않는다 (@types 패키지도 없음).
 * 그래프 3D 렌더에서 실제 사용하는 표면만 최소 선언한다.
 */
declare module 'troika-three-text' {
  import type { Mesh } from 'three';

  export class Text extends Mesh {
    text: string;
    fontSize: number;
    color: string | number;
    /** 채움 불투명도 (0~1). focus dim 표현에 사용. */
    fillOpacity: number;
    anchorX: number | 'left' | 'center' | 'right' | `${number}%`;
    anchorY:
      | number
      | 'top'
      | 'top-baseline'
      | 'middle'
      | 'bottom-baseline'
      | 'bottom'
      | `${number}%`;
    outlineWidth: number | string;
    outlineColor: string | number;
    /** 텍스트 지오메트리를 (재)생성한다. 프로퍼티 변경 후 호출 필요. */
    sync(callback?: () => void): void;
    dispose(): void;
  }
}
