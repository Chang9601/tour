# 소개
여행 예약 사이트

# 기능
- 회원가입/회원수정/회원정보/회원탈퇴 비밀번호 수정/재설정 사용자 조회/목록/수정/차단/차단해제
- 로그인/로그아웃 OAuth 2.0 로그인(네이버/구글, 발급/재발급/해제)
- 리뷰 작성/조회/목록/편집/삭제
- 예약 생성/조회/목록/취소
- 여행 생성/조회/목록/수정/통계

# 기술
| Tech             | Stack             |
| :--------------: |:-----------------:|
| Language         | TypeScript        |
| Framework        | ExpressJS, Jest   |
| Database         | MongoDB, Redis    |
| DevOps           | Docker, Kubernetes|
| Message Broker   | NATS Streaming    |

# 실행 방법
- 호스트 파일 수정(tour.xyz)
  - Windows: C:\\Windows\System32\Drivers\etc\hosts
  - macOS/Linux: /etc/hosts
- Docker, Kubernetes, Skaffold 설치 후 skaffold dev 명령 실행
- OAuth 2.0 로그인 페이지 /oauth2.html

# ERD
![Tour](https://github.com/user-attachments/assets/35afb360-1e4c-4b80-b7bd-c100fe911c54)

# API 문서
https://documenter.getpostman.com/view/18098390/2sAY4sjQ1f

# 기록
- [MSA와 인증(JWT, Cookie, Redis)](https://whooa27.blogspot.com/2024/10/msa.html)
- [MSA와 동시성 문제(OCC, NATS Streaming)](https://whooa27.blogspot.com/2024/10/msa-occ-nats-streaming.html)
- [Distroless 이미지와 NodeJS 기반 애플리케이션 Docker 이미지 크기](https://whooa27.blogspot.com/2024/10/distroless-nodejs-docker.html)
- [Kubernetes를 사용한 배포(Skaffold)](https://whooa27.blogspot.com/2024/10/kubernetes-skaffold.html)
- [Bull을 사용한 예약 취소](https://whooa27.blogspot.com/2024/10/bull.html)
- [화살표 메서드 vs. 일반 메서드](https://whooa27.blogspot.com/2024/10/vs.html)
