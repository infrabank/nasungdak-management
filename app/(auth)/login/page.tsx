export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow">
        <div>
          <h2 className="text-center text-3xl font-bold">로그인</h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            매입/판매/원가 관리 시스템
          </p>
        </div>
        <form className="mt-8 space-y-6">
          <div>
            <label htmlFor="password" className="block text-sm font-medium">
              비밀번호
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              placeholder="비밀번호를 입력하세요"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-md bg-blue-600 py-2 text-white hover:bg-blue-700"
          >
            로그인
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-gray-500">
          TODO: Implement authentication with Server Action
        </p>
      </div>
    </div>
  )
}
