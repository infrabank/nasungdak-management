# SajangBook 구현상태 점검

점검일: 2026-06-05
저장소: `infrabank/nasungdak-management`
실서비스: https://sajangbook.com

## 검증 결과

| 항목 | 결과 | 메모 |
|---|---|---|
| 실서비스 메인 | 정상 | `https://sajangbook.com` 200 |
| 헬스체크 | 정상 | `/api/health` healthy, DB pass |
| TypeScript | 통과 | `npm run type-check` 성공 |
| Unit test | 실패 1건 | Zod UUID 에러 메시지 기대값 불일치 |
| Production build | 환경변수 미설정으로 실패 | 컴파일은 성공. `POSTGRES_URL`, `SESSION_SECRET` 없음 |
| 보안 취약점 | prod 기준 6건 | moderate 3, high 3 |

## 구현된 핵심 기능

| 영역 | 구현상태 | 근거 |
|---|---|---|
| 인증/세션 | 구현됨 | login/signup/onboarding/session refresh |
| 조직/멤버/SaaS 구조 | 상당 부분 구현됨 | organizations, members, invitations, subscriptions |
| 관리자 페이지 | 구현됨 | admin stats, org/user 관리 |
| 매장 관리 | 구현됨 | store CRUD |
| 매입 관리 | 구현됨 | 등록/수정/삭제/목록/CSV/복수 등록/최근 재료 |
| 판매 관리 | 구현됨 | 일일 판매 입력/목록/수정/삭제/CSV/전치 CSV |
| 고정비 관리 | 구현됨 | 등록/수정/삭제/목록 |
| 기름 교체 관리 | 구현됨 | 등록/수정/삭제/통계 |
| 직원/출퇴근 | 구현됨 | employees, attendance CRUD |
| 기초 데이터 | 구현됨 | 메뉴, 재료, SKU, 공급업체, 메뉴-재료, 배분규칙 |
| SKU 레시피/BOM | 구현됨 | skuRecipes 기반 원가 계산 |
| 판매 메뉴/번들 | 구현됨 | salesMenus, salesMenuItems |
| 기간 분석 | 구현됨 | 매출, 변동비, 고정비, 순이익, SKU 분석, 월별 분석 |
| 추가 분석 | 구현됨 | 손익분기, 요일별, 재료가격 추이, 마진, 메뉴엔지니어링 |
| 재고 관리 | 부분 구현 | DB/action/list 있음. 입력 UX는 ID 직접 입력 |
| 재고 알림 | 부분 구현 | 예측/이력은 있음. 실제 카카오 발송은 시뮬레이션 |
| 결제/구독 | 부분 구현 | Stripe 코드 있음. 실제 env/운영 검증 필요 |
| 초대 메일 | 미완성 | `TODO: Send invitation email` |
| POS/토스 연동 | 현재 코드상 없음 | 문서에는 흔적 있으나 app route 없음 |

## 미완성/개선 항목 액션보드

| 우선순위 | 항목 | 상태 | 다음 액션 |
|---|---|---|---|
| P0 | 노출된 로그인 비밀번호 변경 | 필요 | 채팅에 비밀번호가 노출됐으므로 변경 |
| P0 | 테스트 실패 수정 | 필요 | `purchaseSchema` UUID 에러 메시지를 한국어로 맞추거나 테스트 기대값 정정 |
| P0 | 운영 의존성 취약점 정리 | 필요 | `next`, `undici`, `drizzle-orm` 등 audit 검토 후 안전 업그레이드 |
| P0 | 운영 env 기준 빌드 재검증 | 필요 | Vercel과 동일한 env로 `npm run build` 재실행 |
| P1 | 재고 입력 UX 개선 | 미완성 | 매장/재료 ID 직접 입력 대신 선택 콤보박스 적용 |
| P1 | 재고 이벤트 UX 개선 | 미완성 | 폐기/실사/조정도 매장/재료 선택형으로 변경 |
| P1 | 재고 알림 실제 발송 | 미완성 | 카카오 알림톡 템플릿/키 설정 후 시뮬레이션 제거 |
| P1 | 멤버 초대 메일 발송 | 미완성 | 초대 토큰 생성 후 이메일 발송 연결 |
| P1 | 실서비스 로그인 후 핵심 플로우 점검 | 필요 | 매입 등록, 판매 입력, 분석 조회, 재고 조정 수동 테스트 |
| P2 | 모바일 미전환 페이지 확인 | 부분 | 기초데이터/분석/대시보드 실제 모바일 UX 점검 |
| P2 | 문서 최신화 | 필요 | README와 mobile plan의 옛 경로/토스 흔적 정리 |
| P2 | 과금/플랜 제한 실제 검증 | 부분 | Stripe env, webhook, 플랜별 기능 제한 end-to-end 확인 |
| P2 | 백업/내보내기 | 확인 필요 | 운영 데이터 CSV/Excel 백업 버튼 또는 정기 백업 점검 |

## 실제 매장 운영 기준 추천 순서

1. 비밀번호 변경 및 운영 env 기준 빌드 확인
2. 단위테스트 1건 수정
3. 재고 관리 UX를 선택형으로 개선
4. 백업/내보내기 기능 확인 또는 추가
5. 분석 화면에서 현우님이 실제로 보는 지표 기준으로 불필요한 탭 정리
6. 카카오 알림/멤버 초대/Stripe는 SaaS 확장 필요 시 진행
