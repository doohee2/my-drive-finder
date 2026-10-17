# My Drive Finder - 개발 종합 문서 (GEMINI.md)

## 1. 프로그램 소개 (Overview)
**My Drive Finder**는 사용자의 구글 드라이브(Google Drive) 내 특정 폴더에 존재하는 스프레드시트(`.xlsx`, `.xls`, Google Sheets) 및 CSV 파일의 대용량 데이터를 브라우저 로컬 데이터베이스(IndexedDB)에 안전하게 캐싱하고, 밀리초(ms) 단위의 초고속 전문(Full-text) 복합 검색을 제공하는 **오프라인 최우선(Offline-First) PWA(Progressive Web App)** 반응형 웹 애플리케이션입니다.

### 🌟 핵심 설계 철학
1. **클라이언트 중심 아키텍처 (Zero Server Load)**:
   - 서버는 구글 드라이브 API와의 인증 및 프록시 스트리밍 역할만 수행하며, 데이터의 파싱(Parsing), 인메모리 인덱싱, 검색 및 하이라이팅 연산이 100% 사용자의 브라우저에서 수행됩니다.
2. **오프라인 최우선 환경 (Offline-First)**:
   - 지하철, 비행기 등 네트워크가 끊기거나 불안정한 환경에서도 앱이 0.1초 컷으로 즉시 구동되며, 이미 로컬에 저장된 즐겨찾기 폴더 데이터를 자유롭게 검색할 수 있습니다.
3. **무결점 보안 및 제로 누출 (Zero-Leak Security)**:
   - 엔터프라이즈 수준의 6대 보안 헤더, Zod 기반 입력 유효성 검증, 에러 메시지 위생화(Sanitization), 백엔드 비밀 키 완전 격리 및 로그아웃 시 로컬 캐시 즉시 파괴(Purge)를 보장합니다.
4. **증분 동기화 및 쿼터 보호 (Smart Sync)**:
   - 파일의 최종 수정 시간(`modifiedTime`)을 대조하여 변경된 파일만 선별 다운로드하는 증분 동기화(Incremental Sync)와 30초 쿨다운을 적용해 불필요한 구글 API 쿼터 소모와 네트워크 대역폭을 절약합니다.

---

## 2. 개발 프레임워크 및 기술 스택
- **Core Framework**: Next.js 16 (App Router), React 19, TypeScript 5
- **Build & Bundler**: Next.js with Webpack (`next dev --webpack`, `next build --webpack` 강제 사용 - Serwist PWA 빌드 안정성 보장)
- **Styling & Design**: Tailwind CSS v4 (`@theme` 기반 Material Design 3 컬러 토큰), Next-themes (라이트/다크 플랫 테마 완벽 지원), Google Material Symbols Outlined
- **Authentication**: NextAuth.js v5 (Auth.js Beta), Google OAuth 2.0 Provider
  - 권한 스코프: `openid`, `email`, `profile`, `https://www.googleapis.com/auth/drive.readonly`, `https://www.googleapis.com/auth/drive.file`
- **PWA & Service Worker**: Serwist (`@serwist/next`, `serwist`)
  - 커스텀 `CacheFirst` 및 `StaleWhileRevalidate` 전략, 오프라인 Fallback 및 PDF Range 바이패스
- **State Management & Fetching**: TanStack Query v5 (React Query), Controlled State
- **Local Storage Engine**: `localForage` (IndexedDB 기반 비동기 대용량 스토리지)
- **Data Parsing Engine**:
  - `xlsx` (SheetJS): 엑셀 바이너리 파싱, 워크시트(Sheet)별 다중 분할 및 검색 결과 `.xlsx` 내보내기
  - `papaparse`: 고성능 CSV 텍스트 스트리밍 파싱
- **Validation**: `zod` (API 파라미터 및 쿼리 엄격 검증)

---

## 3. 전체적인 프로그램 구조 및 계층 설계
본 애플리케이션은 서버리스 클라우드 환경과 브라우저의 연산 성능을 최적으로 결합한 4대 계층으로 설계되었습니다.

```
┌────────────────────────────────────────────────────────┐
│               동적 UI 렌더링 계층                       │
│  (Header, SearchBar, SearchResults, FolderCard 등)      │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│              실시간 인메모리 검색 엔진                   │
│   (useSearch: 다중 AND 검색, NOT 필터링, 하이라이팅)     │
└───────────────────────────┬────────────────────────────┐
                            │
┌───────────────────────────▼────────────────────────────┐
│           클라이언트 증분 동기화 및 캐시 엔진          │
│   (useDriveSync, localForage(IndexedDB), SheetJS/Papa) │
└───────────────────────────┬────────────────────────────┘
                            │ (fetchWithSessionRetry)
┌───────────────────────────▼────────────────────────────┐
│            서버 API 중계 레이어 (Next.js Routes)        │
│   (/api/drive/*: OAuth 인증, 포맷 자동변환, 스트리밍)    │
└────────────────────────────────────────────────────────┘
```

1. **서버 API 중계 레이어 (`/api/drive/*`)**:
   - 구글 OAuth Access Token을 활용하여 클라이언트의 요청을 구글 드라이브 API와 중계합니다.
   - 구글 문서, 스프레드시트, 프레젠테이션 파일을 요청 시 표준 MS Office 포맷(`.docx`, `.xlsx`, `.pptx`)으로 자동 변환하여 스트리밍 다운로드합니다.
2. **동기화 및 파싱 엔진 (`useDriveSync`)**:
   - 브라우저의 IndexedDB에 파일 메타데이터와 시트 데이터를 캐싱합니다.
   - 원격 드라이브 파일의 `modifiedTime`을 로컬 메타데이터와 비교하여 **변경된 파일만 다운로드**합니다. 다운로드된 파일은 클라이언트 메모리에서 즉시 엑셀/CSV로 파싱되어 JSON 구조로 캐싱됩니다.
3. **인메모리 검색 엔진 (`useSearch`)**:
   - 수만 건에 이르는 로컬 캐시 레코드를 대상으로 브라우저 메모리 상에서 실시간 필터링을 수행합니다. 공백 단위의 다중 키워드(AND) 및 특정 단어 제외(NOT) 필터링을 밀리초(ms) 단위로 처리합니다.
4. **동적 UI 렌더링 계층**:
   - 검색창 입력과 동시에 결과 테이블이 즉시 갱신되며, 파일 및 시트(`_fileId + _sheetName`) 단위의 아코디언 그룹화 및 마우스 드래그를 통한 컬럼 리사이징(Column Resizing)을 지원합니다.

### 🗄️ 로컬 스토리지 (IndexedDB / localStorage) 키 스키마
| 저장소 | 키 패턴 | 데이터 타입 | 설명 |
| :--- | :--- | :--- | :--- |
| **IndexedDB** (`localForage`) | `driveData_{folderId}` | `CachedRow[]` | 폴더 내 파싱된 전체 시트/행 JSON 배열 데이터 (`_id`, `_fileId`, `_fileName`, `_folderId`, `_sheetName` 포함) |
| **IndexedDB** (`localForage`) | `driveMetadata_{folderId}` | `Record<fileId, modifiedTime>` | 증분 동기화 비교를 위한 파일별 최종 수정 시각 맵 |
| **IndexedDB** (`localForage`) | `lastSync_{folderId}` | `string` (ISO 8601) | 해당 폴더의 마지막 동기화 완료 시각 |
| **IndexedDB** (`localForage`) | `cacheSize_{folderId}` | `number` (Bytes) | 해당 폴더 캐시 데이터의 바이트 단위 용량 |
| **IndexedDB** (`localForage`) | `favoriteFolders` | `FavoriteFolder[]` | 즐겨찾기에 등록된 폴더 목록 (`id`, `name`, `fullPath`) |
| **localStorage** | `selectedFolder` | `JSON string` | 마지막으로 선택한 작업 폴더 정보 (`id`, `name`, `fullPath`) |

---

## 4. 주요 소스 파일별 상세 기능과 역할

### 📁 Configuration & Global Setup
- `next.config.ts`: `@serwist/next` PWA 번들러 설정 및 전역 6대 HTTP 보안 헤더(CSP, HSTS 등) 정의.
- `auth.ts`: NextAuth v5 설정, 세션 쿠키 수명(180일) 연장, Access Token 만료 60초 전 조기 갱신 및 에러 세분화(치명적/일시적 분기) 로직.
- `app/manifest.ts`: PWA 설치를 위한 Web App Manifest(`/manifest.webmanifest`) 정의 및 능동 네트워크 핑 엔드포인트 역할.
- `app/globals.css`: Tailwind CSS v4 `@theme` 설정 및 라이트/다크 모드용 Material Design 3 컬러 변수 정의.
- `app/layout.tsx`: 루트 레이아웃. PWA 메타데이터(`appleWebApp`), Google Fonts 사전 연결(`preconnect`), Material Symbols (`display=block`) 및 전역 Provider 결합.
- `app/sw.ts`: Serwist 서비스 워커. 커스텀 캐싱 전략, 폰트/외부 아바타 분리 및 PDF Range 요청 바이패스(`shouldBypass`).

### 📁 Backend API Routes (`app/api/*`)
- `app/api/auth/[...nextauth]/route.ts`: NextAuth 인증 요청 중계 핸들러.
- `app/api/drive/folders/route.ts`: 구글 드라이브 폴더 목록 조회 (타인의 공유 폴더 제외를 위해 `'me' in owners` 필터 적용, 트리 경로 평탄화, Zod 검증).
- `app/api/drive/explore/route.ts`: 특정 폴더(`folderId`) 내부의 직계 자식 폴더/파일 목록 동적 조회 (숨겨진 파일 탐색기 연동).
- `app/api/drive/files/route.ts`: 선택 폴더 내의 `.xlsx`, `.xls`, `.csv` 및 구글 시트 파일 목록 메타데이터 조회.
- `app/api/drive/download/route.ts`: 구글 드라이브 원본/변환 파일을 클라이언트로 스트리밍 프록시 중계 (`Content-Disposition` 네이티브 다운로드 지원 포함).
- `app/api/drive/upload/route.ts`: 서버 프록시 방식의 파일 업로드 중계 처리.

### 📁 Frontend Hooks & Utilities (`hooks/*`, `lib/*`)
- `hooks/useDriveSync.ts`: 핵심 증분 동기화 훅. 30초 쿨다운, 파일 수정일 비교, 다중 시트 엑셀/CSV 파싱, 로컬 캐시 용량 산출 및 TanStack Query 캐시 무효화 담당.
- `hooks/useSearch.ts`: 인메모리 텍스트 필터링(AND/NOT) 및 검색 키워드 매칭 처리.
- `hooks/useNetworkStatus.ts`: 0초 동기 심검 + `HEAD` no-store 능동 핑(1.2초 타임아웃) 기반 하이브리드 실회선 감지.
- `hooks/useFavorites.ts`: 즐겨찾기 폴더 추가/제거 및 전체 로컬 캐시 일괄 초기화(`clearAllCache`) 훅.
- `hooks/useSelectedFolder.ts`: 현재 선택된 동기화 대상 폴더의 상태 및 `localStorage` 동기화 훅.
- `lib/fetchWithSessionRetry.ts`: 401 Unauthorized 수신 시 백그라운드 세션 갱신 후 투명하게 1회 자동 재시도하는 공용 Fetch 래퍼.
- `lib/config.ts`: 전역 애플리케이션 메타데이터 및 하단 업데이트 일자/이스터에그 트리거 텍스트(`lastModifiedText`) 상수 관리.

### 📁 Frontend Providers & Components (`components/*`)
- `components/AuthProvider.tsx`: NextAuth `SessionProvider` 래퍼. 오프라인 부팅 시 불필요한 `/api/auth/session` 호출 차단 및 `refetchWhenOffline={false}` 적용.
- `components/QueryProvider.tsx`: React Query `QueryClientProvider` 래퍼. 오프라인 시 재시도 즉시 중단(`retry: false`) 및 온라인 복구 시 자동 리페치 설정.
- `components/ThemeProvider.tsx`: `next-themes` 다크/라이트 테마 프로바이더.
- `components/Header.tsx`: 플랫 스타일 공식 로고/타이틀(클릭 시 앱 안내 모달 호출), 다크모드 토글, 실시간 동기화 상태 배지(11px 미니멀), 서비스 워커 강제 업데이트 및 보안 로그아웃.
- `components/SideNav.tsx` & `components/BottomNav.tsx`: 데스크톱(좌측 고정 사이드바) 및 모바일(하단 고정 네비게이션 바) 반응형 탭 전환 컴포넌트.
- `components/FolderSettingsCard.tsx`: 현재 선택된 폴더 경로 표시, 실시간 동기화 버튼, 즐겨찾기(별) 토글, 마지막 동기화 일시 및 사용 용량 표시.
- `components/SearchBar.tsx`: 검색어 입력, 제외 단어 토글, 동기화 기록 부재 시 입력 비활성화(`readOnly`) 및 원클릭 동기화 시작 트리거 연동.
- `components/SearchResults.tsx`: 검색 결과 파일/시트별 아코디언 그룹화, 마우스 드래그 컬럼 리사이징 그리드, 키워드 하이라이팅(`HighlightedText`), 필터링 결과 `.xlsx` 내보내기(`handleExport`).
- `components/EmptyState.tsx`: 검색어 입력 전 노출되는 안내 뷰.
- `components/FavoritesView.tsx`: 즐겨찾기 폴더 목록, 개별 폴더 캐시 용량 및 마지막 동기화 시간 표시, 전체 캐시 일괄 초기화.
- `components/FolderPickerModal.tsx`: Breadcrumbs 전체 경로 표시 및 중간 경로 즉시 선택('선택' 버튼)을 지원하는 폴더 선택 모달.
- `components/FileExplorerModal.tsx`: 숨겨진 드라이브 파일 탐색기 및 3단계 다운로드(일반 Proxy / 브라우저 네이티브 / Google API 다이렉트) 지원 모달.
- `components/FileUploadModal.tsx`: 숨겨진 파일 업로더. 프록시 업로드 및 Google API Resumable 다이렉트 업로드와 실시간 진행률 게이지 지원.

---

## 5. 핵심 구현 특징 및 아키텍처 참고 사항 (Deep Dive)

### 🚀 1. 하이브리드 능동 회선 감지 (`useNetworkStatus`)
- **0초 심검 (Zero-Latency)**: 마운트 시 `navigator.onLine`을 동기적으로 확인하여 오프라인 상태일 경우 즉시 불필요한 네트워크 통신을 차단합니다.
- **서비스 워커 위조 200 캐시 방어**: 무선랜 연결 상태이지만 실제 인터넷이 안 되는 '가짜 온라인' 및 서비스 워커의 200 캐시 응답을 회피하기 위해, 극소 정적 파일(`/manifest.webmanifest?_t=${Date.now()}`)에 대해 **`HEAD` 메서드 + `cache: "no-store"` + 1.2초 타임아웃** 능동 핑을 수행합니다.
- **자동 이벤트 바인딩**: 화면 활성화 시 15초 주기 및 `window.onfocus`, `window.ononline`, `window.onoffline` 이벤트에 자동 연동됩니다.

### ⚡ 2. 무한 스피너 폭파 및 0.1초 캐시 개방 (`QueryProvider` & `AuthProvider`)
- React Query의 `retry` 옵션에서 오프라인 감지 시 즉시 재시도를 중단(`return false`)시켜, 스피너 대기 없이 0.1초 만에 로컬 IndexedDB 캐시 데이터를 열어줍니다.
- 온라인 복구 시 `refetchOnReconnect: true`, `refetchOnWindowFocus: true`로 드라이브 변경 사항을 자동 재동기화하며, NextAuth `SessionProvider`에 `session={!isOnline ? null : undefined}` 및 `refetchWhenOffline={false}`를 부여해 오프라인 부팅 시 세션 갱신 렉을 원천 봉쇄했습니다.

### 🔑 3. Google OAuth 세션 유지 및 토큰 갱신 안정화 (Session Persistence)
- **에러 세분화 분기 (`auth.ts`)**: 토큰 갱신 실패 시 `invalid_grant`, `invalid_client` 등 권한이 철회된 치명적 실패일 때만 강제 로그아웃(`RefreshAccessTokenError`)을 실행하고, 단순 네트워크 지연 등 일시적 실패는 무시하고 기존 토큰을 보존하여 다음 요청 시 재시도합니다.
- **`fetchWithSessionRetry` 공용 래퍼**: 통신 중 401 Unauthorized 응답을 만나면 즉각 튕겨나가지 않고, 백그라운드에서 `getSession()`을 호출해 세션을 리프레시한 뒤 투명하게 1회 자동 재시도합니다. Google API 직결 통신 시에도 갱신된 Access Token으로 `Authorization` 헤더를 자동 교체합니다.
- **사전 갱신 & 장기 쿠키**: 토큰 만료 60초 전부터 사전 갱신(Early Refresh)을 시도하며, 브라우저 세션 쿠키 수명(`maxAge`)을 **180일**로 확장했습니다.

### 📦 4. Serwist 서비스 워커 및 캐싱 무결성 (`sw.ts`)
- **Webpack 빌드 강제 (`package.json`)**: Next.js 16+ Turbopack 환경에서 Serwist가 `public/sw.js`를 생성하지 못하는 결함을 방지하기 위해 `"dev": "next dev --webpack"`, `"build": "next build --webpack"`으로 Webpack 번들러를 고정했습니다.
- **커스텀 캐치올 (Catch-All)**: Serwist 기본 매칭 규칙(`defaultCache`)의 `NetworkOnly` 강제 버그를 차단하고, Next.js RSC(`_rsc`) 및 HTML 문서는 `StaleWhileRevalidate`, 내부 고정 정적 자산(`/_next/static/*`)은 1년 `CacheFirst`를 적용했습니다.
- **외부 리소스 분리 및 0번 응답 방어**: 구글 폰트 및 외부 프로필 이미지 CDN 리소스는 **`StaleWhileRevalidate` (30일 이하)**로 분리하고, **`CacheableResponsePlugin({ statuses: [0, 200] })`**을 적용해 CORS 실패로 인한 Opaque(상태 0) 오류가 캐시에 영구 박제되는 현상을 차단했습니다.
- **PDF 뷰어 바이패스**: PC 크롬/엣지 환경에서 PDF Range(206 Partial Content) 요청이 서비스 워커에 가로채여 렌더링이 중단되는 문제를 막기 위해 `shouldBypass` 필터를 적용했습니다.

### 🛡️ 5. 엔터프라이즈 4단계 아키텍처 보안 하드닝
- **Phase 1 (입력 검증 & 위생화)**: 모든 API 라우트에 `Zod` 스키마 검증(`safeParse`)을 적용하고, 500 에러 시 서버 내부 스택 트레이스 대신 `"요청을 처리할 수 없습니다."`로 응답을 위생화(Sanitization)했습니다.
- **Phase 2 (비밀키 Zero-Leak)**: 구글 OAuth 클라이언트 시크릿 등 모든 민감 정보에서 `NEXT_PUBLIC_` 접두사를 완전히 배제하고 서버 환경 변수로 격리했습니다.
- **Phase 3 (PWA 로그아웃 캐시 파괴)**: 로그아웃 시 단순 세션 종료를 넘어 브라우저 `caches`, `localforage(IndexedDB)`, `localStorage`의 모든 데이터를 완전히 삭제(Purge)하는 `handleSecureSignOut`을 장착했습니다.
- **Phase 4 (6대 HTTP 보안 헤더)**: `next.config.ts`를 통해 CSP(구글 폰트/아바타/API 도메인 허용망 포함), HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy를 전역 적용했습니다.

### 🎁 6. 숨겨진 고급 기능 (이스터에그 탐색기 & 멀티 모드 다운로더/업로더)
- **이스터에그 트리거 (`by doohee2`)**: 화면 하단 Footer의 `"by doohee2"` 문구를 클릭하면 현재 활성화된 탭에 따라 숨겨진 고급 도구가 실행됩니다 (오프라인 시 자동 차단).
  - **검색 탭 활성 시 → 드라이브 파일 탐색기 (`FileExplorerModal`) 오픈**: 모바일 메모리 한계와 Vercel 서버 트래픽 제약을 극복하기 위해 3가지 다운로드 모드를 제공합니다:
    1. *일반 다운로드 (Proxy)*: 서버 경유 ReadableStream 다운로드 (실시간 진행률 게이지 및 취소 지원).
    2. *브라우저 다운로드 (Proxy, 백그라운드)*: `Content-Disposition` 헤더를 통해 브라우저 네이티브 다운로드 매니저로 위임 (대용량 파일 모바일 안정성 확보).
    3. *다이렉트 다운로드 (Google API)*: 클라이언트에서 OAuth Access Token으로 Google Drive API를 직접 호출하여 고속 다운로드.
  - **즐겨찾기 탭 활성 시 → 드라이브 파일 업로더 (`FileUploadModal`) 오픈**: 대상 폴더를 선택한 뒤 로컬 파일을 프록시 방식 또는 Google API Resumable 다이렉트 방식으로 실시간 진행률과 함께 업로드합니다.

---

## 6. 환경 변수 및 배포 가이드 (Deployment)

로컬 개발(`.env.local`) 및 Vercel 프로덕션 배포 시 아래 3개의 서버 전용 환경 변수가 필수로 설정되어야 합니다 (클라이언트 노출 방지를 위해 `NEXT_PUBLIC_` 접두사 절대 사용 금지):

```env
GOOGLE_CLIENT_ID="your-google-oauth-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-oauth-client-secret"
AUTH_SECRET="your-nextauth-random-secret-key"
```

---

## 7. 최근 주요 기능 및 UI/UX 수정 이력 (Changelog)

- **동기화 기록 부재 시 검색창 비활성화 및 원클릭 동기화 연동 (`SearchBar`)**:
  - 선택한 폴더의 동기화 기록(`lastSyncTime`)이 없을 경우, 검색 입력을 비활성화(`readOnly`)하고 *"검색 전, 폴더 동기화가 필요합니다. 클릭하면 폴더 동기화를 시작합니다."* 안내 문구를 노출.
  - 검색창 클릭 시 즉시 동기화가 시작되며, 동기화 중에는 실시간 진행률(`syncProgress`)이 표시되도록 구현.
- **메인 폴더 카드 실시간 동기화 버튼 및 정보 연동 (`FolderSettingsCard`)**:
  - 폴더 경로 우측 즐겨찾기(별) 버튼 왼쪽에 동기화(`sync`) 아이콘 버튼 배치.
  - 폴더 경로 하단에 마지막 동기화 시간 및 로컬 캐시 사용 용량 정보를 표시하고, 동기화 완료 시 즉시 갱신되도록 쿼리 무효화 연동.
- **헤더 및 앱 안내 모달 UI/UX 개편 및 브랜딩 일원화 (`Header`)**:
  - 헤더 좌상단의 불필요한 'i' 버튼을 제거하고, 공식 앱 로고와 'Drive Finder' 타이틀 전체를 클릭 가능한 버튼으로 통합하여 안내 모달을 열도록 개편.
  - 앱 안내 모달 헤더의 'i' 아이콘과 '안내' 텍스트를 공식 로고 및 SVG 타이틀로 교체하여 라이트/다크 모드에 완벽 반응하도록 브랜딩 통일.
  - 앱 안내 모달 하단 '확인' 버튼을 제거하고, 좌측에 새 창으로 열리는 '개인정보처리방침' 링크(`https://landing-doohee2.vercel.app/privacy`), 우측에 `APP_CONFIG.lastModifiedText`를 깔끔하게 배치.
  - 앱 로고 및 모달 타이틀의 그림자 및 호버 확대 효과를 제거하여 모던한 **플랫(Flat) 스타일**로 일원화.
  - 상단 타이틀바 동기화 배지의 폰트를 1포인트 축소(`text-[11px]`)하고 도트/스피너 크기를 정돈하였으며, '동기화됨' 상태 시 시간 텍스트를 생략하여 미니멀한 UI 완성 (호버 툴팁으로 시간 확인 가능).
- **GitHub 저장소 Public 전환 대비 무결성 점검**:
  - 하드코딩된 이메일, 패스워드, 시크릿 키 유출 여부를 전수 스캔하여 Zero-Leak 안전성 확인.
- **앱 아이콘 비주얼 개선**:
  - `public/icon-*.png` 파일들의 배경색과 캔버스 규격을 유지하면서 중앙 디자인 심볼을 90% 비율로 축소하여 여백과 시각적 안정성 확보.
- **아이콘 FOUT 글자 노출 차단**:
  - Material Symbols 스타일시트에 `display=block` 및 `preconnect`를 적용해 네트워크 로딩 지연 시 `search`, `calendar_month` 등의 일반 텍스트 원문이 노출되던 취약점 해결.

---

## 8. 향후 고도화 및 확장 제안 (Future Roadmap)

1. **대용량 렌더링 가상화 (Virtualization)**:
   - 검색 결과가 수천~수만 행에 달할 경우 DOM 엘리먼트 과다로 인한 메모리 및 스크롤 성능 저하가 발생할 수 있습니다. `react-window`나 `@tanstack/react-virtual`을 도입하여 뷰포트에 보이는 행만 렌더링하는 가상화 적용을 권장합니다.
2. **Web Worker 기반 비동기 파싱 엔진 분리**:
   - 대용량 엑셀 파일 동기화 시 `SheetJS`의 파싱 연산으로 인해 브라우저 UI 스레드가 일시적으로 멈추는(Freezing) 현상을 예방하기 위해, 파싱 로직을 백그라운드 Web Worker로 이전하여 동기화 중에도 매끄러운 60fps 사용자 경험을 보장할 수 있습니다.
3. **컬럼별 다중 정렬 (Sorting) 및 필터링 기능**:
   - `SearchResults` 데이터 그리드의 헤더 컬럼을 클릭했을 때 숫자/문자열 기준 오름차순/내림차순 정렬 기능 및 컬럼별 세부 필터링 기능 추가.
4. **양방향 데이터 수정 및 드라이브 재업로드 (Write-Back)**:
   - 앱 내 데이터 그리드에서 직접 셀 값을 수정하고, `xlsx` 라이브러리로 바이너리를 재구성하여 구글 드라이브 원본 파일로 업데이트(Write)하는 양방향 동기화 확장.
