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

1. **서버 API 중계 레이어 (`/api/drive/*`)**: 클라이언트에 노출되면 안 되는 Google OAuth 토큰을 활용하여 안전하게 드라이브 폴더 트리 조회 및 메타데이터를 조회합니다. 특히, 구글 스프레드시트 포맷(`vnd.google-apps.spreadsheet`)의 파일은 다중 시트 보존을 위해 강제로 엑셀(`.xlsx`) 포맷으로 엑스포트하여 클라이언트로 스트리밍합니다.
2. **동기화 및 파싱 엔진 (`useDriveSync`)**: 브라우저의 비동기 저장소인 IndexedDB(`localforage`)를 활용해 메타데이터와 파일 데이터를 저장합니다. 드라이브의 파일 수정 시간(`modifiedTime`)을 비교하여 **변경된 파일만 선택적으로 다운로드(증분 동기화)**하여 네트워크 낭비를 줄입니다. 다운로드된 파일은 브라우저 상에서 즉시 `SheetJS` 등을 통해 다중 시트 단위로 파싱되어 JSON 배열로 캐싱됩니다.
3. **검색 엔진 (`useSearch`)**: 수만 건에 달하는 로컬 캐시 데이터를 대상으로 메모리 상에서 즉각적인 필터링을 수행합니다. 띄어쓰기 단위의 다중 키워드(AND 조건) 검색, 특정 단어 제외(NOT 조건) 필터링은 물론, 검색된 키워드의 위치를 찾아내 UI에 전달하는 역할을 합니다.
4. **동적 UI 렌더링 레이어**: 제어 컴포넌트(Controlled Components) 패턴을 활용하여 상단 검색창(`SearchBar`)의 입력 즉시 결과 화면(`SearchResults`)이 갱신됩니다. 검색 결과는 파일명과 시트명을 조합한 고유 키(`_fileId + _sheetName`) 단위로 그룹화되며, 커스텀 자바스크립트 로직을 통한 컬럼 리사이즈(Resize) 기능을 지원하는 고급 데이터 그리드로 그려집니다.

## 4. 주요 소스 파일별 상세 기능과 역할

### 📁 Backend (API Routes & Auth)
- `auth.ts`: NextAuth v5를 활용한 구글 로그인 설정 및 세션(Access Token) 관리, 만료 방지를 위한 **토큰 자동 갱신(Refresh Token) 로직** 포함
- `app/api/auth/[...nextauth]/route.ts`: `auth.ts`의 핸들러를 연결하는 NextAuth 엔드포인트
- `app/api/drive/folders/route.ts`: 구글 드라이브 내 폴더 목록을 조회하며, 하위 폴더 탐색을 위한 트리 구조를 평탄화하여 반환
- `app/api/drive/download/route.ts`: 지정된 파일 ID의 실제 데이터를 다운로드. 구글 시트는 엑셀(`spreadsheetml.sheet`)로 변환 엑스포트하고 일반 파일은 미디어 텍스트로 중계 전송.

### 📁 Frontend (Hooks & Components)
- `app/page.tsx`: 앱의 메인 레이아웃 오케스트레이터. 전역 상태(검색어, 활성 탭, 선택된 폴더)를 관리하며, 조건에 따라 검색 화면이나 즐겨찾기 화면을 교체하여 렌더링함.
- `lib/config.ts`: 애플리케이션 전역 설정(예: 검색 화면 최하단의 업데이트 안내 텍스트 등)을 상수로 분리하여 중앙 집중식으로 관리하는 설정 파일
- `hooks/useDriveSync.ts`: 핵심적인 **증분 동기화 로직** 및 엑셀/구글 시트의 **다중 시트(Multi-sheet) 파싱**을 처리. API 할당량(Quota) 보호를 위한 30초 쿨타임(Cooldown) 로직 포함.
- `hooks/useSearch.ts`: 로컬 캐시 데이터를 기반으로 한 **고속 텍스트 필터링 알고리즘** 담당
- `components/FolderPickerModal.tsx`: 계층형 폴더 구조를 탐색(Breadcrumbs)하고 동기화 타겟을 선택하는 팝업 모달. 화면 스크롤 잠금 및 루트 경로 탐색 등 세밀한 UX 처리 포함.
- `components/FavoritesView.tsx`: 즐겨찾기로 등록된 폴더들의 동기화 시간, 폴더의 전체 경로(`fullPath`), 그리고 사용 중인 **캐시 용량**을 시각적으로 표출하고 관리.
- `components/SearchResults.tsx`: 필터링된 데이터를 파일 및 시트(`_fileId + _sheetName`) 단위로 아코디언 형태로 렌더링.
  - **데이터 그리드**: 순수 JS 기반의 컬럼 넓이 조절(마우스 드래그 리사이즈) 로직과 희미한 엑셀 스타일 격자선 구현.
  - **하이라이팅**: `HighlightedText` 컴포넌트를 내장하여, 검색 키워드와 일치하는 부분만 정밀하게 굵고 푸르게 강조.

## 5. 최근 업데이트 및 주요 기능
- **다중 시트(Multi-sheet) 지원**: 엑셀(`.xlsx`) 파일은 물론 구글 스프레드시트 포맷까지 모두 엑셀로 일괄 파싱하여 내부 워크시트를 개별 그룹으로 노출.
- **고급 데이터 그리드 UI**: 마우스 드래그를 통해 **컬럼 폭 조절(Resize)** 시 테이블 제목과 데이터 레코드 칸이 정확히 동기화되어 크기가 조절되며, 내용이 길면 자동으로 말줄임표 처리됨.
- **검색어 하이라이팅**: 검색어와 일치하는 키워드를 표 내부에서 굵은 글씨와 브랜드 컬러로 즉시 강조.
- **폴더 선택 UI 고도화**: 전체 선택 기능 제거, 직관적인 버튼 위치 재배치, 모달 활성화 시 배경화면 스크롤 잠금 기능 도입 등 디테일한 UX 폴리싱.
- **앱 전역 설정 분리**: `APP_CONFIG` 객체를 별도로 빼어 뷰(UI) 로직과 설정값을 분리.

## 6. 향후 추가 및 개선 제안 (고도화 포인트)
1. **대용량 렌더링 최적화 (Virtualization)**: 현재 수천 건의 결과가 나올 경우 DOM 렌더링 부하가 발생할 수 있습니다. `react-window`나 `react-virtuoso`를 도입하여 화면에 보이는 테이블 행(Row)만 렌더링하는 가상화 기술 도입이 권장됩니다.
2. **Web Worker 기반 비동기 파싱**: `useDriveSync`에서 `SheetJS`를 통해 대용량 엑셀을 파싱할 때 브라우저 UI 스레드가 멈추는(Freezing) 현상을 막기 위해, 파싱 로직을 백그라운드 Web Worker로 분리하면 동기화 중에도 부드러운 앱 사용성을 보장할 수 있습니다.
3. **결과 정렬 (Sorting) 기능 추가**: `SearchResults` 테이블의 헤더(컬럼명)를 클릭했을 때, 해당 컬럼의 값을 기준으로 오름차순/내림차순 정렬을 수행하는 기능 추가.
4. **검색 결과 엑스포트 (Export to CSV/Excel)**: 화면에 검색 및 필터링된 결과물들만 모아서 새로운 엑셀(.xlsx)이나 CSV 파일로 다운로드할 수 있는 내보내기 기능.
5. **데이터 수정 및 양방향 동기화**: 엑셀 데이터를 앱 내에서 직접 수정하고 구글 드라이브 원본 파일로 재업로드(Write)하는 기능. (`xlsx` 라이브러리의 파일 재조립 및 Google Drive API 연동 필요)
