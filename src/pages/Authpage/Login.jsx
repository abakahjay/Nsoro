import React, { useState } from "react";
import { Alert, AlertIcon, Button, Input, Link } from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import useLogin from "../../hooks/useLogin";

export default function Login({onAuth}) {
		// const navigate = useNavigate()
		const { login, isLoading, error } = useLogin();
        const [email, setEmail] = useState("");
        const [password, setPassword] = useState("");
        const handleSubmit = (e) => {
                e.preventDefault();
				login(email, password);
				// navigate(`/?userId=${user.userId}&token=${user.token}`);
		};

    return (
        <>
                <Input
				placeholder='Email'
				fontSize={14}
				type='email'
				size={"sm"}
				value={email}
				onChange={(e) => setEmail(e.target.value)}
			/>
			<Input
				placeholder='Password'
				fontSize={14}
				size={"sm"}
				type='password'
				value={password}
				onChange={(e) => setPassword(e.target.value)}
			/>
			{error && (
				<Alert status='error' fontSize={13} p={2} borderRadius={4}>
					<AlertIcon fontSize={12} />
					{error}
				</Alert>
			)}
			<Button
				w={"full"}
				colorScheme='brand'
				size={"sm"}
				fontSize={14}
				isLoading={isLoading}
				onClick={(e) => handleSubmit(e)}
			>
				Log in
			</Button>
			{/* Hosted by the backend: emails a reset link for the shared account */}
			<Link
				href={`${import.meta.env.VITE_API_URL}/forgotPassword?app=shared&return=${encodeURIComponent(window.location.href)}`}
				fontSize={13}
				color='gray.500'
			>
				Forgot password?
			</Link>
        </>
    )
}
