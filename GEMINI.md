# My Drive Finder - 개발 문서 (GEMINI.md)

## 1. 문서 개요
**My Drive Finder**는 사용자의 구글 드라이브(Google Drive)에 존재하는 특정 폴더 내의 스프레드시트(`.xlsx`, `.xls`) 및 CSV 데이터를 브라우저 로컬 DB에 캐싱하고, 밀리초(ms) 단위의 초고속 복합 검색을 제공하는 PWA(Progressive Web App) 기반의 반응형 웹 애플리케이션입니다. 
서버 부하를 최소화하고 사용자 경험을 극대화하기 위해 **데이터의 파싱과 검색이 모두 클라이언트 사이드(Browser)에서 이루어지는 점**이 가장 큰 특징입니다.

## 2. 사용된 기술 스택 및 프레임워크
- **Core**: Next.js 16 (App Router), React, TypeScript
- **Styling**: Tailwind CSS (CSS 변수 기반의 다크모드 완벽 지원)
- **Authentication**: NextAuth.js v5 (Google OAuth 2.0 Provider)
- **PWA & Service Worker**: Serwist (`@serwist/next`)
- **Data Fetching & API**: Googleapis (Drive v3 API)
- **Local Caching**: localForage (IndexedDB 기반 비동기 스토리지)
- **Data Parsing**: 
  - `xlsx` (SheetJS) - 엑셀 파일 파싱
  - `papaparse` - CSV 파일 파싱

## 3. 전체적인 프로그램 구조
본 애플리케이션은 서버 부하를 없애고 브라우저의 자원을 최대한 활용하는 **클라이언트 중심 아키텍처**로 설계되었습니다. 크게 **[서버 API 중계 레이어]**, **[클라이언트 동기화 로직]**, **[실시간 검색 엔진]**, **[동적 UI 렌더링 레이어]** 4가지 계층으로 나뉩니다.

1. **서버 API 중계 레이어 (`/api/drive/*`)**: 클라이언트에 노출되면 안 되는 Google OAuth 토큰을 활용하여 안전하게 드라이브 폴더 트리 조회 및 메타데이터를 조회합니다. 구글 전용 포맷(문서, 시트, 슬라이드) 파일은 자동으로 MS 오피스 포맷(`.docx`, `.xlsx`, `.pptx`)으로 변환하여 클라이언트로 스트리밍(프록시 다운로드)합니다.
2. **동기화 및 파싱 엔진 (`useDriveSync`)**: 브라우저의 비동기 저장소인 IndexedDB(`localforage`)를 활용해 메타데이터와 파일 데이터를 저장합니다. 드라이브의 파일 수정 시간(`modifiedTime`)을 비교하여 **변경된 파일만 선택적으로 다운로드(증분 동기화)**하여 네트워크 낭비를 줄입니다. 다운로드된 파일은 브라우저 상에서 즉시 `SheetJS` 등을 통해 다중 시트 단위로 파싱되어 JSON 배열로 캐싱됩니다.
3. **검색 엔진 (`useSearch`)**: 수만 건에 달하는 로컬 캐시 데이터를 대상으로 메모리 상에서 즉각적인 필터링을 수행합니다. 띄어쓰기 단위의 다중 키워드(AND 조건) 검색, 특정 단어 제외(NOT 조건) 필터링은 물론, 검색된 키워드의 위치를 찾아내 UI에 전달하는 역할을 합니다.
4. **동적 UI 렌더링 레이어**: 제어 컴포넌트(Controlled Components) 패턴을 활용하여 상단 검색창(`SearchBar`)의 입력 즉시 결과 화면(`SearchResults`)이 갱신됩니다. 검색 결과는 파일명과 시트명을 조합한 고유 키(`_fileId + _sheetName`) 단위로 그룹화되며, 커스텀 자바스크립트 로직을 통한 컬럼 리사이즈(Resize) 기능을 지원하는 고급 데이터 그리드로 그려집니다.

## 4. 주요 소스 파일별 상세 기능과 역할

### 📁 Backend (API Routes & Auth)
- `auth.ts`: NextAuth v5를 활용한 구글 로그인 설정 및 세션(Access Token) 관리, 만료 방지를 위한 **토큰 자동 갱신(Refresh Token) 로직** 포함. (파일 생성을 위해 `drive.file` 스코프 권한 적용됨)
- `app/api/auth/[...nextauth]/route.ts`: `auth.ts`의 핸들러를 연결하는 NextAuth 엔드포인트
- `app/api/drive/folders/route.ts`: 구글 드라이브 내 폴더 목록을 조회하며, 하위 폴더 탐색을 위한 트리 구조를 평탄화하여 반환. ('me' in owners 필터를 적용하여 타인의 공유 폴더 제외)
- `app/api/drive/explore/route.ts`: 특정 폴더(`folderId`) 내부의 직계 자식 폴더 및 파일 목록을 동적으로 가져오며, 숨겨진 파일 탐색기 기능에서 활용.
- `app/api/drive/download/route.ts`: 구글 드라이브의 파일을 클라이언트로 중계 다운로드(프록시). 구글 문서/시트/슬라이드는 자동으로 MS Office 포맷으로 변환하여 스트리밍.

### 📁 Frontend (Hooks & Components)
- `app/page.tsx`: 앱의 메인 레이아웃 오케스트레이터. 전역 상태(검색어, 활성 탭)를 관리하며, 하단 Footer 텍스트 클릭 시 숨겨진 파일 탐색기를 여는 이스터에그 트리거 포함.
- `lib/config.ts`: 애플리케이션 전역 설정(예: 검색 화면 최하단의 업데이트 안내 텍스트 등)을 상수로 분리하여 중앙 집중식으로 관리하는 설정 파일
- `hooks/useDriveSync.ts`: 핵심적인 **증분 동기화 로직** 및 엑셀/구글 시트의 **다중 시트(Multi-sheet) 파싱**을 처리. API 할당량(Quota) 보호를 위한 30초 쿨타임(Cooldown), 오프라인 통신 차단 및 5초 타임아웃(`AbortSignal.timeout`) 로직 포함.
- `hooks/useSearch.ts`: 로컬 캐시 데이터를 기반으로 한 **고속 텍스트 필터링 알고리즘** 담당
- `hooks/useNetworkStatus.ts`: `window.addEventListener('online'/'offline')`을 통해 실시간으로 네트워크 연결 상태를 감지하는 커스텀 훅
- `components/FolderPickerModal.tsx`: 계층형 폴더 구조를 탐색(Breadcrumbs)하고 동기화 및 업로드 타겟을 선택하는 팝업 모달. 루트부터 이어지는 전체 경로 표시 및 경로 직접 선택(선택 버튼) 기능 포함.
- `components/FileExplorerModal.tsx`: Google Picker 없이 자체적으로 구글 드라이브 파일을 탐색하고 직접 로컬로 다운로드할 수 있는 숨겨진 탐색기 모달 창. 다이렉트 다운로드(Google API) 기능 및 전체 경로 표시 지원.
- `components/FileUploadModal.tsx`: 로컬 파일을 선택하여 구글 드라이브의 특정 폴더로 업로드할 수 있는 신규 모달. 일반 프록시 업로드와 다이렉트 업로드(Google API) 방식을 모두 지원하며 실시간 퍼센트 게이지 표시 기능을 포함.
- `components/SearchResults.tsx`: 필터링된 데이터를 파일 및 시트(`_fileId + _sheetName`) 단위로 아코디언 형태로 렌더링.
  - **데이터 그리드**: 순수 JS 기반의 컬럼 넓이 조절(마우스 드래그 리사이즈) 로직과 희미한 엑셀 스타일 격자선 구현.
  - **하이라이팅**: `HighlightedText` 컴포넌트를 내장하여, 검색 키워드와 일치하는 부분만 정밀하게 굵고 푸르게 강조.
  - **결과 내보내기**: 필터링된 현재 화면의 데이터를 단일 `.xlsx` 형식으로 내보내는 기능(`handleExport`) 포함.

## 5. 최근 업데이트 및 주요 기능
- **Google OAuth 세션 유지 및 토큰 갱신 안정화 (Session Persistence)**:
  - 클라이언트의 Access Token 갱신 로직(`auth.ts`)을 고도화하여, 토큰 갱신 실패를 **치명적 실패(`invalid_grant`, 권한 철회 등)**와 **일시적 실패(네트워크 오류 등)**로 구분했습니다. 치명적 실패 시에만 강제 로그아웃 처리되며, 일시적 실패는 묵인하고 다음 요청 시 재시도하도록 완화했습니다.
  - API 통신 시 401 에러를 만났을 때 즉시 로그아웃 하던 낡은 동작을 폐기하고, **`fetchWithSessionRetry`** 공용 헬퍼를 도입했습니다. 401 응답 시 내부적으로 세션을 리프레시(`getSession()`)하여 토큰을 갱신한 뒤, 투명하게 1회 자동 재시도하여 사용자 경험이 단절되지 않도록 방어 로직을 짰습니다.
  - 갱신이 원활하게 진행될 수 있도록 토큰 만료 60초 전부터 사전 갱신(Early Refresh)을 시도하며, 브라우저 세션 쿠키 수명(`maxAge`)을 **180일**로 대폭 늘려 다시 로그인해야 하는 빈도를 획기적으로 줄였습니다.
- **오프라인 무한 스피너 폭파 및 하이브리드 능동 회선 감지 적용**:
  - **하이브리드 능동 회선 판독기 (`useNetworkStatus`)**: 마운트 시 `navigator.onLine` 0초 동기 심검(Zero-Latency)을 적용하고, 서비스 워커의 위조 200 캐시나 가짜 온라인 신호를 회피하기 위해 정적 자원(`/manifest.webmanifest?_t=${Date.now()}`)에 대해 **`HEAD` 메서드 + `no-store` + 1.2초 타임아웃** 능동 핑을 수행하여 실제 통신 생존 여부를 가려내도록 개편했습니다. 화면 활성 시 15초 주기 및 `onfocus`/`ononline` 이벤트에 자동 바인딩되었습니다.
  - **무한 스피너 차단 및 자동 재동기화 (`QueryProvider` & `AuthProvider`)**: React Query `retry` 설정을 조정하여 오프라인 감지 시 즉시 재시도(`return false`)를 차단해 초기 구동 대기 없이 0.1초 만에 로컬 캐시를 열어주며, 온라인 회복 시 `refetchOnReconnect: true`, `refetchOnWindowFocus: true` 옵션으로 즉각 실시간 자동 회복되도록 보완했습니다. SessionProvider에는 `refetchWhenOffline={false}` 설정을 장착해 무익한 세션 요청을 원천 차단했습니다.
- **아이콘 및 외부 프로필 이미지 렌더링 무결성 하드닝 (3대 유지보수 지침 적용)**:
  - **CSP 도메인 허용망 보완 (`next.config.ts`)**: 서비스 워커의 `fetch` 통신과 외부 자원 로딩이 차단되지 않도록 `connect-src`, `font-src`, `img-src` 헤더에 `https://*.gstatic.com`, `https://*.googleapis.com`, `https://*.googleusercontent.com`, `https://*.ggpht.com`을 필수로 추가했습니다.
  - **아이콘 FOUT 깜빡임 및 원문 글자 노출 차단 (`app/layout.tsx`)**: Google Fonts 및 gstatic에 대한 사전 연결(`preconnect`, `crossOrigin="anonymous"`) 링크를 장착하고, Material Symbols 아이콘 스타일시트 파라미터를 `display=swap` 대신 **`display=block`**으로 전면 교체하여 아이콘 로딩 지연 시 `search` 같은 일반 글자 원문이 렌더링되는 취약점을 해결했습니다.
  - **서비스 워커 캐시 룰 분리 및 0번 응답 방어 (`sw.ts`)**: 구글 폰트 및 외부 교차 도메인 리소스(프로필 아바타 CDN 등)를 최상위 우선순위의 **`StaleWhileRevalidate` (30일 이하)** 규칙으로 분리하고, Opaque(상태 코드 0) 에러나 일시적 차단이 고정 캐싱되지 않도록 **`CacheableResponsePlugin({ statuses: [0, 200] })`**을 적용했습니다. 프로젝트 내부의 static 고정 자산(`/_next/static/*` 등)만 1년짜리 `CacheFirst`를 유지하도록 정렬했습니다.
- **4단계 아키텍처 보안 하드닝(Security Hardening) 적용**: 클라이언트와 서버리스 API 경계의 취약점을 차단하고 엔터프라이즈 급 보안을 달성했습니다.
  - **Phase 1 (인가 및 Zod 입력 유효성 검증)**: 모든 `/api/drive/**` 엔드포인트에 `Zod` 라이브러리를 도입하여 쿼리 및 폼 파라미터에 대한 엄격한 스키마 유효성 검증(`safeParse`)을 적용했습니다. 외부 API나 서버 내부 예외 메시지가 클라이언트에 전송되지 않도록 500 오류 시 모두 `"요청을 처리할 수 없습니다."`로 통일하는 위생화(Error Sanitization)를 달성했습니다.
  - **Phase 2 (비밀자격 격리 및 Zero-Leak 지침)**: 구글 OAuth 자격증명 등 모든 비밀 키에서 `NEXT_PUBLIC_` 접두사를 철저히 차단(Zero-Leak 보증)하였으며, Vercel 대시보드 환경 변수 설정 시에도 백엔드 격리를 유지할 수 있도록 모범 지침을 수립했습니다.
  - **Phase 3 (PWA 로그아웃 시 민감 캐시 파괴 방어막)**: `Header.tsx` 내 로그아웃 트리거 시 단순 `signOut` 호출을 넘어, `window.caches`의 Service Worker 캐시, `localforage(IndexedDB)` 엑셀 데이터, `localStorage` 사용자 설정을 완전히 삭제 및 초기화(Purge)하는 강력한 보호 방어막(`handleSecureSignOut`)을 장착했습니다.
  - **Phase 4 (6대 HTTP 고강도 보안 헤더 적용)**: `next.config.ts`의 `headers()` 속성을 통해 전역 라우트를 대상으로 CSP(Content-Security-Policy), HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy 등 6대 보안 헤더를 설정하여 클릭재킹, XSS 및 스니핑 공격을 원천 봉쇄했습니다.
  - **PC 데스크톱 PDF 뷰어 렌더링 호환성 개선**: `sw.ts`에 HTTP Range 요청 및 `.pdf` 파일 요청을 서비스 워커가 건너뛰는(`shouldBypass`) 필터를 장착하고 Blob 다운로드 시 MIME Type을 명시하여 PC 환경(크롬/엣지) 내 PDF 렌더러가 끊김 없이 작동하도록 개선했습니다.
- **오프라인 최우선(Offline-First) PWA 아키텍처 개편**: 0.1초 컷으로 즉시 화면이 뜨는 오프라인 PWA 사용 경험을 구현했습니다.
  - **Serwist 커스텀 캐시 전략 (`sw.ts`)**: Serwist 기본 매칭 규칙(`defaultCache`)의 `NetworkOnly` 강제 버그를 차단하기 위해 커스텀 캐치올(catch-all)을 작성했습니다. 정적 자산(JS/CSS/이미지/폰트)은 `CacheFirst`, HTML 문서와 Next.js RSC(`_rsc`)는 `StaleWhileRevalidate`를 강제 적용하며, `navigationPreload: false`로 렌더링 지연을 차단했습니다.
  - **iOS Safari PWA Standalone 지원**: `layout.tsx` 내 `appleWebApp` 메타데이터 추가 및 `SessionProvider`의 잦은 백그라운드 요청(`refetchInterval={0}`, `refetchOnWindowFocus={false}`)을 방지하여 오프라인 시 iOS Safari 화면 프리징을 완벽 해결했습니다.
  - **오프라인 기능 방어 로직**: 상단바에 시각적 오프라인 아이콘(☁️✕)을 즉시 표시하며, 오프라인 시 [구글 로그인/로그아웃], [동기화], [폴더 변경], [이스터에그 탐색기 및 업로드 모달]을 자동으로 활성 불가능하게 잠가, 이미 저장된 즐겨찾기 목록 캐시의 텍스트 검색에 집중하도록 개선했습니다.
  - **수동 서비스 워커 캐시 초기화 기능**: 상단 안내(Info) 모달 내에 `navigator.serviceWorker.getRegistrations()` 및 `caches.keys()`를 활용하여 기존 SW 캐시를 지우고 즉시 강제로 최신 버전을 새로고침하는 기능 버튼을 탑재했습니다.
- **고급 파일 다운로드 기능**: `FileExplorerModal`에 파일명 및 용량을 확인할 수 있는 '다운로드 확인 팝업'을 추가했습니다. 모바일 기기의 메모리 한계를 극복하고 대역폭 제약을 피하기 위해 다운로드 방식을 세 가지로 세분화했습니다:
  1. **일반 다운로드 (Proxy)**: Vercel 서버를 경유하는 자바스크립트 스트림 다운로드 방식으로 실시간 취소 및 게이지 표시를 지원합니다.
  2. **브라우저 다운로드 (Proxy, 백그라운드)**: `Content-Disposition` 헤더 처리를 통해 네이티브 브라우저의 다운로드 관리자로 처리하여 500MB 이상의 파일도 모바일 사파리 등에서 끊김 없이 저장할 수 있습니다.
  3. **다이렉트 다운로드 (Google API)**: 클라이언트에서 세션 액세스 토큰을 통해 직접 구글 서버 API를 호출하여 파일을 받는 방식으로, Vercel 트래픽 제약을 피하고 고속 다운로드가 가능합니다.
- **숨겨진 파일 업로드 기능 (이스터에그)**: 즐겨찾기 탭 하단의 "by doohee2" 텍스트 클릭 시 로컬 파일을 지정된 구글 드라이브 폴더로 바로 업로드하는 기능(`FileUploadModal`)이 추가되었습니다. 다운로드와 마찬가지로 프록시 방식과 구글 API 다이렉트 방식을 모두 제공하며 시각적인 진행률 막대를 제공합니다.
- **모달 UI/UX 전면 개선**:
  - `FolderPickerModal` 및 `FileExplorerModal` 상단에 루트(내 드라이브)부터 현재 위치까지 이어지는 **전체 경로(Breadcrumbs)**를 항상 표시하여 폴더 탐색 직관성을 크게 개선했습니다.
  - `FolderPickerModal` 경로 표시줄 옆에 '선택' 버튼을 배치하여, 보고 있는 중간 경로의 폴더를 즉시 동기화/업로드 대상으로 손쉽게 지정할 수 있게 되었습니다.
- **UI 및 테마 디테일 개선**:
  - `globals.css`의 라이트 모드 테마에서 누락되었던 `--color-on-primary` 토큰을 복구하여 색상 명암비 문제를 픽스했습니다.
  - 모달 내 긴 파일명 및 폴더명이 삐져나오지 않고 말줄임표(`...`)로 예쁘게 잘리도록 최적화했습니다.
- **검색 결과 엑스포트 기능 추가**: 화면에 필터링된 레코드만 모아서 `.xlsx` 파일로 다운로드할 수 있는 버튼이 파일 그룹 헤더(아이콘)에 추가되었습니다.
- **숨겨진 파일 탐색기 (이스터에그)**: 검색 탭 Footer의 "by doohee2" 텍스트 클릭 시 커스텀 파일 탐색기 및 다운로더 창이 열리며 구글 전용 포맷을 MS 오피스 포맷으로 자동 변환해 줍니다.
- **공유 폴더 제외**: "폴더 변경" 창에서 타인의 공유 폴더가 노출되지 않도록 필터링 로직이 추가되었습니다.
- **다중 시트(Multi-sheet) 지원**: 엑셀(`.xlsx`) 파일은 물론 구글 스프레드시트 포맷까지 모두 엑셀로 일괄 파싱하여 내부 워크시트를 개별 그룹으로 노출.
- **앱 전역 설정 분리**: `APP_CONFIG` 객체를 별도로 빼어 뷰(UI) 로직과 설정값을 분리.

## 6. 향후 추가 및 개선 제안 (고도화 포인트)
1. **대용량 렌더링 최적화 (Virtualization)**: 현재 수천 건의 결과가 나올 경우 DOM 렌더링 부하가 발생할 수 있습니다. `react-window`나 `react-virtuoso`를 도입하여 화면에 보이는 테이블 행(Row)만 렌더링하는 가상화 기술 도입이 권장됩니다.
2. **Web Worker 기반 비동기 파싱**: `useDriveSync`에서 `SheetJS`를 통해 대용량 엑셀을 파싱할 때 브라우저 UI 스레드가 멈추는(Freezing) 현상을 막기 위해, 파싱 로직을 백그라운드 Web Worker로 분리하면 동기화 중에도 부드러운 앱 사용성을 보장할 수 있습니다.
3. **결과 정렬 (Sorting) 기능 추가**: `SearchResults` 테이블의 헤더(컬럼명)를 클릭했을 때, 해당 컬럼의 값을 기준으로 오름차순/내림차순 정렬을 수행하는 기능 추가.
4. **데이터 수정 및 양방향 동기화**: 엑셀 데이터를 앱 내에서 직접 수정하고 구글 드라이브 원본 파일로 재업로드(Write)하는 기능. (`xlsx` 라이브러리의 파일 재조립 및 Google Drive API 연동 필요)
