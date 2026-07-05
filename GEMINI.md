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
본 애플리케이션은 크게 **[서버 API 레이어]**, **[클라이언트 동기화 엔진]**, **[클라이언트 검색 엔진]**, **[UI 렌더링 레이어]** 4가지로 구성됩니다.

1. **서버 API 레이어 (`/api/drive/*`)**: 구글 OAuth 토큰을 활용하여 드라이브 폴더 트리 조회, 파일 메타데이터 조회, 파일 스트리밍 다운로드를 중계합니다.
2. **동기화 엔진 (`useDriveSync`)**: IndexedDB에 저장된 로컬 메타데이터와 구글 드라이브의 메타데이터(`modifiedTime`)를 비교하여, **변경되거나 새로 추가된 파일만 선택적으로 다운로드(증분 동기화)** 합니다. 다운로드된 파일은 브라우저에서 즉시 JSON 배열로 파싱되어 캐시됩니다.
3. **검색 엔진 (`useSearch`)**: 캐시된 수만 건의 로컬 데이터를 대상으로, 띄어쓰기 단위의 다중 키워드(AND 조건) 검색 및 제외어(NOT 조건) 필터링을 메모리 상에서 실시간으로 수행합니다.
4. **UI 레이어**: 제어 컴포넌트(Controlled Components) 패턴을 활용하여 검색창(`SearchBar`)의 입력 즉시 결과(`SearchResults`)가 화면에 파일별로 그룹화되어 렌더링됩니다.

## 4. 주요 소스 파일별 기능과 역할

### 📁 Backend (API Routes & Auth)
- `auth.ts`: NextAuth v5를 활용한 구글 로그인 설정 및 세션(Access Token) 관리, **토큰 자동 갱신(Refresh Token) 로직** 포함
- `app/api/auth/[...nextauth]/route.ts`: `auth.ts`의 핸들러를 연결하는 NextAuth 엔드포인트
- `app/api/drive/folders/route.ts`: 구글 드라이브 내 폴더 목록을 계층적으로 탐색(Drill-down)할 수 있도록 경로(Path)를 포함해 반환
- `app/api/drive/files/route.ts`: 특정 폴더 내의 `.csv`, `.xlsx` 파일들의 메타데이터(수정 시간 등) 조회
- `app/api/drive/download/route.ts`: 지정된 파일 ID의 실제 바이너리/텍스트 데이터를 스트리밍으로 다운로드
- `app/api/drive/upload/route.ts`: (스텁) 향후 데이터 수정 및 쓰기 기능을 위한 빈 엔드포인트

### 📁 Frontend (Hooks & Components)
- `hooks/useDriveSync.ts`: 핵심적인 **증분 동기화 로직** 및 엑셀/구글 시트의 **다중 시트(Multi-sheet) 파싱**을 처리. API 할당량(Quota) 보호를 위한 30초 쿨타임(Cooldown) 로직 포함.
- `hooks/useSearch.ts`: 로컬 캐시 데이터를 기반으로 한 **고속 텍스트 필터링 알고리즘** 담당
- `components/FolderPickerModal.tsx`: 구글 드라이브 계층 구조 탐색 및 동기화할 타겟 폴더를 선택하는 모달 UI (직관적인 '선택' 버튼 배치 적용)
- `components/FavoritesView.tsx`: 즐겨찾기로 등록된 폴더 목록과 각 폴더의 전체 캐시 용량 및 전체 경로(`fullPath`)를 관리 및 표출
- `components/SearchBar.tsx`: 검색어 및 제외어 입력을 관리하는 상단 검색바
- `components/SearchResults.tsx`: 필터링된 데이터를 파일 및 시트(`_fileId + _sheetName`) 단위로 그룹화하여 렌더링. **검색어 하이라이팅**, **마우스 드래그 기반 컬럼 리사이즈**, **엑셀 스타일 격자선** 등 고급 데이터 그리드(Data Grid) UI 구현.
- `components/Header.tsx`: 앱 로고, 동기화 상태 배지, 다크모드 토글, 앱 정보 모달, 구글 로그인/로그아웃 버튼을 포함한 글로벌 헤더

## 5. 최근 업데이트 및 주요 기능
- **다중 시트(Multi-sheet) 지원**: 단일 시트만 가져오던 한계를 넘어, 엑셀(`.xlsx`) 파일은 물론 구글 스프레드시트의 모든 내부 워크시트를 개별적으로 파싱하여 검색 결과에 독립적으로 노출합니다.
- **고급 데이터 그리드 UI**: 엑셀을 사용하는 것과 동일하게 마우스 드래그를 통해 **컬럼 폭을 자유자재로 조절(Resize)**할 수 있으며, 내용이 길면 자동으로 말줄임표 처리됩니다. 가독성을 높이는 옅은 격자선(Grid)도 추가되었습니다.
- **검색어 하이라이팅**: 검색어와 정확히 일치하는 단어(키워드)를 표 내부에서 굵은 글씨와 브랜드 컬러로 즉시 강조(Highlight)하여 직관성을 높였습니다.
- **계층형 폴더 탐색**: 플랫한 폴더 리스트 대신 빵판(Breadcrumbs)과 하위 폴더 진입을 지원하는 드릴다운(Drill-down) 방식의 폴더 선택기로 UX 개선
- **안정적인 세션 유지 (Refresh Token)**: 구글 Access Token 만료 1분 전 자동으로 토큰을 갱신(Refresh)하여 장시간 사용 시에도 끊김 없는 동기화 지원
- **초고속 실시간 검색 (Instant Search)**: 타이핑과 동시에 화면이 갱신되는 반응성 확보
- **PWA 완벽 지원 & 앱 아이콘**: `manifest.ts` 및 전용 커스텀 앱 아이콘을 탑재하여 데스크탑/모바일 네이티브 앱처럼 설치 가능

## 6. 향후 유지보수 시 고려사항
1. **대용량 렌더링 최적화 (Virtualization)**: 현재는 검색 결과를 한 번에 테이블로 렌더링합니다. 검색 결과가 수천~수만 건에 달할 경우 브라우저 DOM 렌더링 부하가 올 수 있으므로, 향후 `react-window`나 `react-virtuoso`를 활용한 테이블 가상화(Virtualization) 도입이 권장됩니다. (컬럼 리사이즈 기능과 호환되도록 주의 필요)
2. **데이터 수정 및 쓰기**: 현재 뷰어 및 검색용으로 최적화되어 불필요한 액션(수정) 버튼을 제거했습니다. 만약 엑셀 데이터를 앱 내에서 수정하고 드라이브로 재업로드(Write)하는 기능을 추후 부활시킨다면, `xlsx` 라이브러리의 파일 재조립 로직 및 Google Drive API `update` 메서드 연동이 필요합니다.
