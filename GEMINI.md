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
- `auth.ts`: NextAuth v5를 활용한 구글 로그인 설정 및 세션(Access Token) 관리, 만료 방지를 위한 **토큰 자동 갱신(Refresh Token) 로직** 포함
- `app/api/auth/[...nextauth]/route.ts`: `auth.ts`의 핸들러를 연결하는 NextAuth 엔드포인트
- `app/api/drive/folders/route.ts`: 구글 드라이브 내 폴더 목록을 조회하며, 하위 폴더 탐색을 위한 트리 구조를 평탄화하여 반환. ('me' in owners 필터를 적용하여 타인의 공유 폴더 제외)
- `app/api/drive/explore/route.ts`: 특정 폴더(`folderId`) 내부의 직계 자식 폴더 및 파일 목록을 동적으로 가져오며, 숨겨진 파일 탐색기 기능에서 활용.
- `app/api/drive/download/route.ts`: 구글 드라이브의 파일을 클라이언트로 중계 다운로드(프록시). 구글 문서/시트/슬라이드는 자동으로 MS Office 포맷으로 변환하여 스트리밍.

### 📁 Frontend (Hooks & Components)
- `app/page.tsx`: 앱의 메인 레이아웃 오케스트레이터. 전역 상태(검색어, 활성 탭)를 관리하며, 하단 Footer 텍스트 클릭 시 숨겨진 파일 탐색기를 여는 이스터에그 트리거 포함.
- `lib/config.ts`: 애플리케이션 전역 설정(예: 검색 화면 최하단의 업데이트 안내 텍스트 등)을 상수로 분리하여 중앙 집중식으로 관리하는 설정 파일
- `hooks/useDriveSync.ts`: 핵심적인 **증분 동기화 로직** 및 엑셀/구글 시트의 **다중 시트(Multi-sheet) 파싱**을 처리. API 할당량(Quota) 보호를 위한 30초 쿨타임(Cooldown) 로직 포함.
- `hooks/useSearch.ts`: 로컬 캐시 데이터를 기반으로 한 **고속 텍스트 필터링 알고리즘** 담당
- `components/FolderPickerModal.tsx`: 계층형 폴더 구조를 탐색(Breadcrumbs)하고 동기화 타겟을 선택하는 팝업 모달. 
- `components/FileExplorerModal.tsx`: Google Picker 없이 자체적으로 구글 드라이브 파일을 탐색하고 직접 로컬로 다운로드할 수 있는 숨겨진 탐색기 모달 창. 파일 용량 표시 지원.
- `components/SearchResults.tsx`: 필터링된 데이터를 파일 및 시트(`_fileId + _sheetName`) 단위로 아코디언 형태로 렌더링.
  - **데이터 그리드**: 순수 JS 기반의 컬럼 넓이 조절(마우스 드래그 리사이즈) 로직과 희미한 엑셀 스타일 격자선 구현.
  - **하이라이팅**: `HighlightedText` 컴포넌트를 내장하여, 검색 키워드와 일치하는 부분만 정밀하게 굵고 푸르게 강조.
  - **결과 내보내기**: 필터링된 현재 화면의 데이터를 단일 `.xlsx` 형식으로 내보내는 기능(`handleExport`) 포함.

## 5. 최근 업데이트 및 주요 기능
- **고급 파일 다운로드 기능**: `FileExplorerModal`에 파일명 및 용량을 확인할 수 있는 '다운로드 확인 팝업'을 추가했습니다. 모바일 기기의 메모리 한계를 극복하기 위해 다운로드 방식을 두 가지로 세분화했습니다:
  1. **기본 다운로드**: 자바스크립트 스트림(`getReader`)을 통해 실시간 퍼센트 게이지(Progress Bar)를 보여주며, 중간에 취소(`AbortController`)가 가능합니다.
  2. **브라우저 다운로드 (대용량)**: `Content-Disposition` 헤더 처리를 통해 사파리 등 네이티브 브라우저의 다운로드 관리자로 처리하여 500MB 이상의 거대한 파일도 끊김 없이 저장할 수 있는 하이브리드 우회 기능을 제공합니다.
- **UI 및 테마 디테일 개선**:
  - `globals.css`의 라이트 모드 테마에서 누락되었던 `--color-on-primary` 토큰을 복구하여 모든 테마에서 색상 명암비가 올바르게 작동하도록 픽스했습니다.
  - PC 환경의 좌측 네비게이션(`SideNav`) 타이틀을 굵은 한글/영문 병기로 디자인을 강화했습니다.
  - 모달 내 긴 파일명 및 폴더명이 삐져나오지 않고 말줄임표(`...`)로 예쁘게 잘리도록 Flex 레이아웃(`min-w-0`)을 최적화했습니다.
- **검색 결과 엑스포트 기능 추가**: 화면에 필터링된 레코드만 모아서 `.xlsx` 파일로 다운로드할 수 있는 버튼이 파일 그룹 헤더(아이콘)에 추가되었습니다.
- **숨겨진 파일 탐색기 (이스터에그)**: Footer의 "by doohee2" 텍스트 클릭 시 Google Picker를 대체하는 **커스텀 파일 탐색기 및 다운로더** 창이 열립니다. 구글 전용 포맷(문서, 시트, 슬라이드)을 MS 오피스 포맷으로 자동 변환해 줍니다.
- **공유 폴더 제외**: "폴더 변경" 창에서 다른 사용자가 공유한 폴더는 노출되지 않고 오직 사용자가 소유한 폴더만 나타나도록 API 필터링 로직이 추가되었습니다.
- **다중 시트(Multi-sheet) 지원**: 엑셀(`.xlsx`) 파일은 물론 구글 스프레드시트 포맷까지 모두 엑셀로 일괄 파싱하여 내부 워크시트를 개별 그룹으로 노출.
- **앱 전역 설정 분리**: `APP_CONFIG` 객체를 별도로 빼어 뷰(UI) 로직과 설정값을 분리.

## 6. 향후 추가 및 개선 제안 (고도화 포인트)
1. **대용량 렌더링 최적화 (Virtualization)**: 현재 수천 건의 결과가 나올 경우 DOM 렌더링 부하가 발생할 수 있습니다. `react-window`나 `react-virtuoso`를 도입하여 화면에 보이는 테이블 행(Row)만 렌더링하는 가상화 기술 도입이 권장됩니다.
2. **Web Worker 기반 비동기 파싱**: `useDriveSync`에서 `SheetJS`를 통해 대용량 엑셀을 파싱할 때 브라우저 UI 스레드가 멈추는(Freezing) 현상을 막기 위해, 파싱 로직을 백그라운드 Web Worker로 분리하면 동기화 중에도 부드러운 앱 사용성을 보장할 수 있습니다.
3. **결과 정렬 (Sorting) 기능 추가**: `SearchResults` 테이블의 헤더(컬럼명)를 클릭했을 때, 해당 컬럼의 값을 기준으로 오름차순/내림차순 정렬을 수행하는 기능 추가.
4. **데이터 수정 및 양방향 동기화**: 엑셀 데이터를 앱 내에서 직접 수정하고 구글 드라이브 원본 파일로 재업로드(Write)하는 기능. (`xlsx` 라이브러리의 파일 재조립 및 Google Drive API 연동 필요)
