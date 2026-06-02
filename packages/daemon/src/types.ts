// types.ts — daemon 런타임 메타. cli(daemon-client.DaemonMeta)와 동형으로 유지한다
// (/api/health 응답 셰이프 = 두 패키지의 계약점).

export interface DaemonMeta {
  pid: number;
  port: number;
  ssotDir: string;
  startedAt: string;
}
