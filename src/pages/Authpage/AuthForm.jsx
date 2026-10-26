import { Box, Checkbox, Flex, Image, Link, Text, VStack } from "@chakra-ui/react";
import { RotatingWords } from '../../components/RotatingWords';
import { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import Login from "./Login";
import Signup from "./Signup";
import GoogleAuth from "./GoogleAuth";
//Everything is in pixels

// What people share on Nsoro, from its own description.
const SHARE_WORDS = ['photos.', 'videos.', 'stories.', 'reels.'];

export function AuthForm({onAuth}){
    const [isLogin, setIsLogin] = useState(true);
    // Age + terms confirmation, required before an account is created by email or Google.
    const [agreed, setAgreed] = useState(false);
    const [consentNudge, setConsentNudge] = useState(false);
    const needsConsent = !isLogin && !agreed;
    const askConsent = () => setConsentNudge(true);

    return (
        <>
            <Box border={"1px solid gray"} borderRadius={4} padding={5}>
                <VStack spacing={4}>
                    <Image src='/logo.png' h={24} cursor={"pointer"} alt='Nsoro' />
                    <Text fontSize={14} color='gray.400' textAlign='center'>
                        Share your <Text as='span' color='blue.400' fontWeight='600'><RotatingWords words={SHARE_WORDS} /></Text>
                    </Text>

                    {!isLogin && (
                        <Checkbox
                            isChecked={agreed}
                            onChange={(e) => { setAgreed(e.target.checked); setConsentNudge(false); }}
                            isInvalid={consentNudge}
                            alignItems='flex-start'
                            w='full'
                            data-testid='checkbox-consent'
                        >
                            <Text as='span' fontSize={13} color='gray.300'>
                                I&apos;m 13 or older and agree to the{" "}
                                <Link as={RouterLink} to='/terms' color='brand.400' textDecoration='underline'>Terms</Link> and{" "}
                                <Link as={RouterLink} to='/privacy' color='brand.400' textDecoration='underline'>Privacy Policy</Link>.
                            </Text>
                        </Checkbox>
                    )}
                    {consentNudge && (
                        <Text role='alert' fontSize={13} color='red.300' w='full'>
                            Please confirm you are 13 or older and agree to the terms.
                        </Text>
                    )}

                    {isLogin ? <Login onAuth={onAuth} /> : <Signup onAuth={onAuth} needsConsent={needsConsent} onNeedConsent={askConsent} />}

                    {/* ---------------- OR -------------- */}
                    <Flex alignItems={"center"} justifyContent={"center"} my={4} gap={1} w={"full"}>
                        <Box flex={2} h={"1px"} bg={"gray.400"} />
                        <Text mx={1} color={"white"}>
                            OR
                        </Text>
                        <Box flex={2} h={"1px"} bg={"gray.400"} />
                    </Flex>

                    <GoogleAuth prefix={isLogin ? "Log in" : "Sign up"} needsConsent={needsConsent} onNeedConsent={askConsent} />
                </VStack>
            </Box>

            <Box border={"1px solid gray"} borderRadius={4} padding={3}>
                <Flex alignItems={"center"} justifyContent={"center"}>
                    <Box mx={2} fontSize={14}>
                        {isLogin ? "Don't have an account?" : "Already have an account?"}
                    </Box>
                    <Box role="button" tabIndex={0} onClick={() => setIsLogin(!isLogin)} color={"brand.400"} cursor={"pointer"}>
                        {isLogin ? "Sign up" : "Log in"}
                    </Box>
                </Flex>
            </Box>
            <Text fontSize={12} color='gray.500' textAlign='center'>
                <Link as={RouterLink} to='/terms'>Terms</Link> · <Link as={RouterLink} to='/privacy'>Privacy</Link>
            </Text>
        </>
    );
};

