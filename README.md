# nvrs-nostr-address

[Live Demo](https://nvrs.xyz)

## About

**nvrs-nostr-address** is a web application that enables users to obtain free [Nostr](https://nostr.com/) addresses using the [NIP-05](https://github.com/nostr-protocol/nips/blob/master/05.md) protocol. With simple registration and instant address assignment, anyone can get their own NIP-05 identifier—no cost, no hassle.

## Features

- Free NIP-05 address registration for Nostr protocol.
- Modern authentication and database handling via Supabase.
- Fast, scalable, and server-side rendered with Next.js.
- Built with TypeScript for type safety and maintainability.

## Tech Stack

- [Next.js](https://nextjs.org/) (React framework)
- [Supabase](https://supabase.com/) (authentication & database)
- [TypeScript](https://www.typescriptlang.org/)

## Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- npm or yarn
- Supabase account and project (for backend setup)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/devmonstr/nvrs-nostr-address.git
   cd nvrs-nostr-address
   ```

2. **Install dependencies:**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Configure Supabase:**
   - Create a project at [Supabase](https://app.supabase.com/).
   - Copy your Supabase credentials (`SUPABASE_URL` and `SUPABASE_ANON_KEY`).
   - Create a `.env.local` file in the root directory:
     ```
     NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
     ```

4. **Run the development server:**
   ```bash
   npm run dev
   # or
   yarn dev
   ```
   Visit [http://localhost:3000](http://localhost:3000) to view the app.

## Usage

- Visit the live site or run locally.
- Sign up or log in.
- Register a NIP-05 address and start using it with your Nostr client.

## Contributing

Contributions, issues and feature requests are welcome!

1. Fork this repo.
2. Create your feature branch (`git checkout -b feature/YourFeature`).
3. Commit your changes (`git commit -am 'Add new feature'`).
4. Push to the branch (`git push origin feature/YourFeature`).
5. Open a pull request.

## License

This project is open source—see the [LICENSE](LICENSE) file for details.

## Contact

- Author: [devmonstr](https://github.com/devmonstr)
- Project URL: [https://github.com/devmonstr/nvrs-nostr-address](https://github.com/devmonstr/nvrs-nostr-address)

---

> Powered by Supabase, Next.js, and the Nostr protocol.
