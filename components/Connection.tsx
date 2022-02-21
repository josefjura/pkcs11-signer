type ConnectionProps = {
  connected: boolean;
};

const Connection = ({ connected }: ConnectionProps) => {
  {
    return connected ? (
      <div>
        <span>Connected to Fortify</span>
        <svg
          style={{ verticalAlign: "middle" }}
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="green"
          width={24}
          height={24}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>
    ) : (
      <div>Trying to connect to Fortify</div>
    );
  }
};

export default Connection;
